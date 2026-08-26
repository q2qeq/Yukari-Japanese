"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { AttendanceStatus } from "@/lib/types";

export type { AttendanceStatus };

export type MarkAttendanceResult =
  | { ok: true; remainingSessions: number | null }
  | { ok: false; error: string; code: "NO_PASS" | "UNAUTHORIZED" | "UNKNOWN" };

/**
 * 출석 상태를 기록하고, present로 바뀔 때만 활성 수강권에서 1회 차감합니다.
 * 이미 present였다가 다른 상태로 바뀌면 차감을 복구합니다(+1).
 * 잔여 회차가 0 이하로 내려가는 것(외상)은 스키마상 허용되며, 그 판단은
 * 화면(확인 모달)에서 사용자가 먼저 하고 이 함수는 그 결정을 그대로 반영합니다.
 */
export async function markAttendance(
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
  memo?: string,
): Promise<MarkAttendanceResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "ログインが必要です。", code: "UNAUTHORIZED" };
  }

  try {
    const remaining = await sql.begin(async (tx) => {
      const [existing] = await tx<{ status: AttendanceStatus }[]>`
        select status from attendance
        where class_session_id = ${sessionId} and student_id = ${studentId}
      `;
      const wasPresent = existing?.status === "present";
      const willBePresent = status === "present";

      const [attendance] = await tx<{ id: string }[]>`
        insert into attendance (class_session_id, student_id, status, checked_by, checked_at, memo)
        values (${sessionId}, ${studentId}, ${status}, ${session.staffId}, now(), ${memo ?? null})
        on conflict (class_session_id, student_id)
        do update set status = excluded.status,
                      checked_by = excluded.checked_by,
                      checked_at = now(),
                      memo = excluded.memo
        returning id
      `;

      if (willBePresent && !wasPresent) {
        const [pass] = await tx<{ id: string; remaining_sessions: number }[]>`
          select id, remaining_sessions from payment_passes
          where student_id = ${studentId} and status = 'active'
          for update
        `;
        if (!pass) {
          // 트랜잭션 안에서 던져서 전체 롤백 (attendance insert도 취소)
          throw new NoPassError();
        }
        const [updated] = await tx<{ remaining_sessions: number }[]>`
          update payment_passes set remaining_sessions = remaining_sessions - 1
          where id = ${pass.id}
          returning remaining_sessions
        `;
        await tx`
          insert into pass_deductions (payment_pass_id, attendance_id, delta, reason, created_by)
          values (
            ${pass.id}, ${attendance.id}, -1,
            ${memo ? `出席チェック（メモ：${memo}）` : "出席チェック"},
            ${session.staffId}
          )
        `;
        return updated.remaining_sessions;
      }

      if (!willBePresent && wasPresent) {
        const [pass] = await tx<{ id: string; remaining_sessions: number }[]>`
          select id, remaining_sessions from payment_passes
          where student_id = ${studentId} and status = 'active'
          for update
        `;
        if (pass) {
          const [updated] = await tx<{ remaining_sessions: number }[]>`
            update payment_passes set remaining_sessions = remaining_sessions + 1
            where id = ${pass.id}
            returning remaining_sessions
          `;
          await tx`
            insert into pass_deductions (payment_pass_id, attendance_id, delta, reason, created_by)
            values (${pass.id}, ${attendance.id}, 1, '出席状況変更による復元', ${session.staffId})
          `;
          return updated.remaining_sessions;
        }
        return null;
      }

      // 상태가 실질적으로 안 바뀐 경우(present -> present 재저장 등): 현재 잔여만 조회
      const [pass] = await tx<{ remaining_sessions: number }[]>`
        select remaining_sessions from payment_passes
        where student_id = ${studentId} and status = 'active'
      `;
      return pass?.remaining_sessions ?? null;
    });

    revalidatePath(`/sessions/${sessionId}`);
    return { ok: true, remainingSessions: remaining };
  } catch (err) {
    if (err instanceof NoPassError) {
      return {
        ok: false,
        error: "この生徒には登録された受講パスがありません。先に回数チャージを行ってください。",
        code: "NO_PASS",
      };
    }
    console.error("markAttendance failed", err);
    return { ok: false, error: "処理中に問題が発生しました。", code: "UNKNOWN" };
  }
}

class NoPassError extends Error {}
