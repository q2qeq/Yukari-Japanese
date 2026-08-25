"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendKakaoAlimtalk, type KakaoTemplateCode } from "@/lib/kakao";

export type ActionResult =
  | { ok: true; status: "sent" | "pending"; message: string }
  | { ok: false; error: string };

const TEMPLATE_BY_KIND = {
  low_balance: "LOW_BALANCE_REMIND" as KakaoTemplateCode,
  payment_overdue: "PAYMENT_OVERDUE_REMIND" as KakaoTemplateCode,
};

function buildMessage(kind: "low_balance" | "payment_overdue", studentName: string, remaining: number) {
  if (kind === "low_balance") {
    return `[미도리 일본어학원] ${studentName} 학생, 수강권 잔여 회차가 ${remaining}회 남았어요. 다음 방문 시 회차 충전을 안내해주세요.`;
  }
  return `[미도리 일본어학원] ${studentName} 학생, 결제가 필요해요 (현재 ${-remaining}회 외상). 다음 방문 시 결제를 안내해주세요.`;
}

/**
 * 잔여 임박/외상 학생에게 알림을 발송한다. 카카오 알림톡 연동이 아직 실제
 * 발급받은 키/템플릿이 없는 동안에는 lib/kakao.ts의 폴백 모드가 자동으로
 * 로그만 남기고, 나중에 환경변수만 채우면 그대로 실제 발송으로 전환된다.
 */
export async function sendBalanceNotification(
  studentId: string,
  kind: "low_balance" | "payment_overdue",
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const [student] = await sql<
    { id: string; name: string; phone: string | null; guardian_phone: string | null }[]
  >`select id, name, phone, guardian_phone from students where id = ${studentId}`;
  if (!student) return { ok: false, error: "학생 정보를 찾을 수 없습니다." };

  const [pass] = await sql<{ id: string; remaining_sessions: number }[]>`
    select id, remaining_sessions from payment_passes
    where student_id = ${studentId} and status = 'active'
  `;
  if (!pass) return { ok: false, error: "활성 수강권이 없습니다." };

  const content = buildMessage(kind, student.name, pass.remaining_sessions);
  const recipientPhone = student.guardian_phone || student.phone;

  const sendResult = await sendKakaoAlimtalk({
    to: recipientPhone,
    templateCode: TEMPLATE_BY_KIND[kind],
    content,
  });

  const sentAt = sendResult.status === "sent" ? new Date() : null;
  await sql`
    insert into notification_logs (
      student_id, channel, trigger_type, template_code, content, status, sent_at, error_message
    ) values (
      ${studentId}, ${sendResult.channel}, ${kind}, ${TEMPLATE_BY_KIND[kind]}, ${content},
      ${sendResult.status}, ${sentAt},
      ${sendResult.status === "failed" ? sendResult.error ?? null : null}
    )
  `;

  if (!sendResult.ok) {
    revalidatePath(`/students/${studentId}`);
    return { ok: false, error: sendResult.error ?? "발송에 실패했습니다." };
  }

  if (kind === "low_balance") {
    await sql`update payment_passes set notified_low_balance = true where id = ${pass.id}`;
  } else {
    await sql`update payment_passes set notified_overdue = true where id = ${pass.id}`;
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/director/unpaid");
  revalidatePath("/");

  return {
    ok: true,
    status: sendResult.status as "sent" | "pending",
    message:
      sendResult.status === "sent"
        ? "카카오 알림톡을 발송했습니다."
        : sendResult.error ?? "카카오 연동 전이라 기록만 저장했습니다.",
  };
}
