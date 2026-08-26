"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type ClassFormState = { error?: string } | undefined;

type SlotInput = { dayOfWeek: number; startTime: string; endTime: string };

// 반을 개설하면 앞으로 8주치 실제 회차(class_sessions)를 미리 만들어 둔다.
// 그래야 "오늘의 수업"/출석 체크 화면에 바로 반영된다. 8주 이후는 필요할 때
// 이 로직을 다시 돌리거나(추후 배치화) 반을 다시 열어 늘리면 된다.
const SESSION_GENERATION_WEEKS = 8;

function toDateInputString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateSessionDates(dayOfWeek: number): string[] {
  const dates: string[] = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const totalDays = SESSION_GENERATION_WEEKS * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    if (d.getUTCDay() === dayOfWeek) {
      dates.push(toDateInputString(d));
    }
  }
  return dates;
}

function readSlotKey(dayOfWeek: number, startTime: string, endTime: string): string {
  return `${dayOfWeek}|${startTime}|${endTime}`;
}

function parseAndValidateSlots(slotsJson: string): SlotInput[] | { error: string } {
  let slots: SlotInput[];
  try {
    slots = JSON.parse(slotsJson);
  } catch {
    return { error: "時間割情報をご確認ください。" };
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return { error: "曜日・時間を1つ以上追加してください。" };
  }
  for (const s of slots) {
    if (
      typeof s.dayOfWeek !== "number" ||
      s.dayOfWeek < 0 ||
      s.dayOfWeek > 6 ||
      !s.startTime ||
      !s.endTime ||
      s.startTime >= s.endTime
    ) {
      return { error: "曜日・時間の入力をもう一度ご確認ください。" };
    }
  }
  return slots;
}

export async function createClass(
  _prevState: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  const session = await getSession();
  if (!session) return { error: "ログインが必要です。" };

  const name = String(formData.get("name") || "").trim();
  const level = String(formData.get("level") || "").trim() || null;
  const capacityRaw = String(formData.get("capacity") || "10");
  const classroomId = String(formData.get("classroomId") || "") || null;
  const slotsJson = String(formData.get("slotsJson") || "[]");

  if (!name) return { error: "クラス名を入力してください。" };

  const capacity = Number(capacityRaw);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    return { error: "定員は1以上の数字を入力してください。" };
  }

  const slotsResult = parseAndValidateSlots(slotsJson);
  if (!Array.isArray(slotsResult)) return slotsResult;
  const slots = slotsResult;

  const teacherId = session.staffId;

  await sql.begin(async (tx) => {
    const [cls] = await tx<{ id: string }[]>`
      insert into classes (name, level, teacher_id, classroom_id, capacity)
      values (${name}, ${level}, ${teacherId}, ${classroomId}, ${capacity})
      returning id
    `;

    for (const slot of slots) {
      await tx`
        insert into class_schedule_slots (class_id, day_of_week, start_time, end_time)
        values (${cls.id}, ${slot.dayOfWeek}, ${slot.startTime}, ${slot.endTime})
      `;

      const dates = generateSessionDates(slot.dayOfWeek);
      for (const date of dates) {
        await tx`
          insert into class_sessions (class_id, session_date, start_time, end_time, teacher_id)
          values (${cls.id}, ${date}, ${slot.startTime}, ${slot.endTime}, ${teacherId})
        `;
      }
    }
  });

  revalidatePath("/schedule");
  revalidatePath("/director/schedule");
  revalidatePath("/director/classrooms");
  revalidatePath("/classrooms");
  redirect("/schedule");
}

export async function updateClass(
  classId: string,
  _prevState: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  const session = await getSession();
  if (!session) return { error: "ログインが必要です。" };

  const [cls] = await sql<{ teacher_id: string }[]>`
    select teacher_id from classes where id = ${classId}
  `;
  if (!cls) return { error: "クラスが見つかりません。" };
  if (session.role !== "owner" && session.staffId !== cls.teacher_id) {
    return { error: "このクラスを編集する権限がありません。" };
  }

  const name = String(formData.get("name") || "").trim();
  const level = String(formData.get("level") || "").trim() || null;
  const capacityRaw = String(formData.get("capacity") || "10");
  const classroomId = String(formData.get("classroomId") || "") || null;
  const status = String(formData.get("status") || "active");
  const slotsJson = String(formData.get("slotsJson") || "[]");

  if (!name) return { error: "クラス名を入力してください。" };

  const capacity = Number(capacityRaw);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    return { error: "定員は1以上の数字を入力してください。" };
  }
  if (status !== "active" && status !== "archived") {
    return { error: "ステータスをご確認ください。" };
  }

  const slotsResult = parseAndValidateSlots(slotsJson);
  if (!Array.isArray(slotsResult)) return slotsResult;
  const slots = slotsResult;

  const existingSlots = await sql<
    { day_of_week: number; start_time: string; end_time: string }[]
  >`
    select day_of_week, start_time, end_time from class_schedule_slots where class_id = ${classId}
  `;

  const submittedKeys = new Set(
    slots.map((s) => readSlotKey(s.dayOfWeek, s.startTime, s.endTime)),
  );
  const existingKeys = new Set(
    existingSlots.map((s) => readSlotKey(s.day_of_week, s.start_time, s.end_time)),
  );

  const slotsToRemove = existingSlots.filter(
    (s) => !submittedKeys.has(readSlotKey(s.day_of_week, s.start_time, s.end_time)),
  );
  const slotsToAdd = slots.filter(
    (s) => !existingKeys.has(readSlotKey(s.dayOfWeek, s.startTime, s.endTime)),
  );

  await sql.begin(async (tx) => {
    await tx`
      update classes set
        name = ${name},
        level = ${level},
        classroom_id = ${classroomId},
        capacity = ${capacity},
        status = ${status}
      where id = ${classId}
    `;

    // 요일/시간이 빠졌으면 그 슬롯의 "앞으로 예정된, 아직 출석 체크 안 된" 회차만
    // 정리한다. 이미 지난 회차나 출석 기록이 남은 회차는 이력 보존을 위해 그대로 둔다.
    for (const s of slotsToRemove) {
      await tx`
        delete from class_sessions cs
        where cs.class_id = ${classId}
          and cs.session_date > current_date
          and cs.status = 'scheduled'
          and cs.start_time = ${s.start_time}
          and cs.end_time = ${s.end_time}
          and extract(dow from cs.session_date)::int = ${s.day_of_week}
          and not exists (select 1 from attendance a where a.class_session_id = cs.id)
      `;
      await tx`
        delete from class_schedule_slots
        where class_id = ${classId}
          and day_of_week = ${s.day_of_week}
          and start_time = ${s.start_time}
          and end_time = ${s.end_time}
      `;
    }

    // 새로 추가된 요일/시간은 오늘부터 8주치 회차를 새로 만든다(반 개설과 동일 로직).
    for (const slot of slotsToAdd) {
      await tx`
        insert into class_schedule_slots (class_id, day_of_week, start_time, end_time)
        values (${classId}, ${slot.dayOfWeek}, ${slot.startTime}, ${slot.endTime})
      `;

      const dates = generateSessionDates(slot.dayOfWeek);
      for (const date of dates) {
        await tx`
          insert into class_sessions (class_id, session_date, start_time, end_time, teacher_id)
          values (${classId}, ${date}, ${slot.startTime}, ${slot.endTime}, ${cls.teacher_id})
        `;
      }
    }

    // 반을 보관 처리하면 앞으로 예정된(아직 출석 체크 안 된) 회차는 모두 정리한다.
    if (status === "archived") {
      await tx`
        delete from class_sessions cs
        where cs.class_id = ${classId}
          and cs.session_date > current_date
          and cs.status = 'scheduled'
          and not exists (select 1 from attendance a where a.class_session_id = cs.id)
      `;
    }
  });

  revalidatePath("/schedule");
  revalidatePath("/director/schedule");
  revalidatePath("/director/classrooms");
  revalidatePath("/classrooms");
  revalidatePath(`/classes/${classId}`);
  redirect(`/classes/${classId}`);
}
