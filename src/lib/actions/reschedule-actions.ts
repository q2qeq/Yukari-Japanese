"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type CreateRescheduleState = { error?: string } | undefined;

/**
 * 학생 상세 화면의 "연기 요청"에서 호출된다. 특정 예정 세션 하나에 대해
 * pending 상태의 연기 요청을 만든다. 실제 보강 일정 배정은 별도 화면
 * (scheduleMakeup)에서 선생님이 처리한다.
 */
export async function createRescheduleRequest(
  _prevState: CreateRescheduleState,
  formData: FormData,
): Promise<CreateRescheduleState> {
  const session = await getSession();
  if (!session) return { error: "ログインが必要です。" };

  const studentId = String(formData.get("studentId") || "");
  const classSessionId = String(formData.get("classSessionId") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!studentId || !classSessionId) {
    return { error: "延期する授業を選択してください。" };
  }

  const [dup] = await sql<{ id: string }[]>`
    select id from reschedule_requests
    where class_session_id = ${classSessionId} and student_id = ${studentId}
      and status in ('pending', 'scheduled')
  `;
  if (dup) {
    return { error: "すでにこの授業について延期リクエストがあります。" };
  }

  await sql`
    insert into reschedule_requests (class_session_id, student_id, requested_by, requester_staff_id, reason)
    values (${classSessionId}, ${studentId}, 'teacher', ${session.staffId}, ${reason || null})
  `;

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/reschedule");
  redirect(`/students/${studentId}`);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * 대기중인 연기 요청에 보강 날짜/시간을 배정한다.
 *  1. 원본 세션과 같은 반(class_id)으로 is_makeup=true인 새 세션을 만든다.
 *  2. 원본 세션에서 이 학생의 출석을 'makeup_scheduled'(차감 보류)로 표시한다
 *     (원본 세션 자체는 취소하지 않는다 — 다른 학생들은 정상 진행).
 *  3. reschedule_requests.status를 scheduled로 바꾸고 makeup_session_id를 연결한다.
 */
export async function scheduleMakeup(
  requestId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ログインが必要です。" };

  if (!date || !startTime || !endTime) {
    return { ok: false, error: "振替の日付と時間を入力してください。" };
  }
  if (startTime >= endTime) {
    return { ok: false, error: "終了時間は開始時間より後にしてください。" };
  }

  try {
    await sql.begin(async (tx) => {
      const [request] = await tx<
        { id: string; class_session_id: string; student_id: string | null; status: string }[]
      >`
        select id, class_session_id, student_id, status from reschedule_requests
        where id = ${requestId}
        for update
      `;
      if (!request) throw new Error("リクエストが見つかりません。");
      if (request.status !== "pending") throw new Error("すでに処理済みのリクエストです。");
      if (!request.student_id) throw new Error("このリクエストは個別生徒の振替対象ではありません。");

      const [original] = await tx<{ class_id: string; teacher_id: string }[]>`
        select class_id, teacher_id from class_sessions where id = ${request.class_session_id}
      `;
      if (!original) throw new Error("元の授業情報が見つかりません。");

      const [makeup] = await tx<{ id: string }[]>`
        insert into class_sessions (class_id, session_date, start_time, end_time, teacher_id, status, is_makeup, original_session_id)
        values (${original.class_id}, ${date}, ${startTime}, ${endTime}, ${original.teacher_id}, 'scheduled', true, ${request.class_session_id})
        returning id
      `;

      await tx`
        insert into attendance (class_session_id, student_id, status, checked_by, checked_at, memo)
        values (
          ${request.class_session_id}, ${request.student_id}, 'makeup_scheduled', ${session.staffId}, now(),
          ${"振替割当：" + date + " " + startTime.slice(0, 5)}
        )
        on conflict (class_session_id, student_id)
        do update set status = 'makeup_scheduled', checked_by = excluded.checked_by,
                      checked_at = now(), memo = excluded.memo
      `;

      await tx`
        update reschedule_requests
        set status = 'scheduled', makeup_session_id = ${makeup.id}
        where id = ${requestId}
      `;
    });
  } catch (err) {
    console.error("scheduleMakeup failed", err);
    const message = err instanceof Error ? err.message : "処理中に問題が発生しました。";
    return { ok: false, error: message };
  }

  revalidatePath("/reschedule");
  revalidatePath("/");
  return { ok: true };
}

export async function cancelRescheduleRequest(requestId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ログインが必要です。" };

  const rows = await sql<{ status: string }[]>`
    update reschedule_requests set status = 'canceled'
    where id = ${requestId} and status = 'pending'
    returning status
  `;
  if (rows.length === 0) {
    return { ok: false, error: "保留中のリクエストのみキャンセルできます。" };
  }

  revalidatePath("/reschedule");
  return { ok: true };
}
