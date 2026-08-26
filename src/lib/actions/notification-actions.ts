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
    return `[ゆかり日本語教室] ${studentName}さん、受講パスの残り回数があと${remaining}回になりました。次回ご来校時に回数チャージのご案内をお願いします。`;
  }
  return `[ゆかり日本語教室] ${studentName}さん、お支払いが必要です(現在${-remaining}回分未払い)。次回ご来校時にお支払いのご案内をお願いします。`;
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
  if (!session) return { ok: false, error: "ログインが必要です。" };

  const [student] = await sql<
    { id: string; name: string; phone: string | null; guardian_phone: string | null }[]
  >`select id, name, phone, guardian_phone from students where id = ${studentId}`;
  if (!student) return { ok: false, error: "生徒情報が見つかりません。" };

  const [pass] = await sql<{ id: string; remaining_sessions: number }[]>`
    select id, remaining_sessions from payment_passes
    where student_id = ${studentId} and status = 'active'
  `;
  if (!pass) return { ok: false, error: "有効な受講パスがありません。" };

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
    return { ok: false, error: sendResult.error ?? "送信に失敗しました。" };
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
        ? "カカオ通知メッセージを送信しました。"
        : sendResult.error ?? "カカオ連携前のため記録のみ保存しました。",
  };
}
