"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type CreateClassState = { error?: string } | undefined;

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

export async function createClass(
  _prevState: CreateClassState,
  formData: FormData,
): Promise<CreateClassState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const name = String(formData.get("name") || "").trim();
  const level = String(formData.get("level") || "").trim() || null;
  const capacityRaw = String(formData.get("capacity") || "10");
  const classroomId = String(formData.get("classroomId") || "") || null;
  const slotsJson = String(formData.get("slotsJson") || "[]");

  if (!name) return { error: "반 이름을 입력해주세요." };

  const capacity = Number(capacityRaw);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    return { error: "정원은 1 이상의 숫자여야 합니다." };
  }

  let slots: SlotInput[];
  try {
    slots = JSON.parse(slotsJson);
  } catch {
    return { error: "시간표 정보를 확인해주세요." };
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return { error: "요일/시간을 한 개 이상 추가해주세요." };
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
      return { error: "요일/시간 입력을 다시 확인해주세요." };
    }
  }

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
  redirect("/schedule");
}
