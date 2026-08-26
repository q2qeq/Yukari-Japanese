"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type ChargeState = { error?: string } | undefined;

/**
 * 회차 충전: 기존 활성 수강권이 있으면 completed로 닫고, 그 잔여(양수든
 * 마이너스=외상이든)를 carried_sessions로 그대로 넘겨 새 수강권을 만듭니다.
 * 새 수강권의 remaining_sessions = 충전 회차 수 + carried_sessions.
 */
export async function chargeSessions(
  _prevState: ChargeState,
  formData: FormData,
): Promise<ChargeState> {
  const session = await getSession();
  if (!session) {
    return { error: "ログインが必要です。" };
  }

  const studentId = String(formData.get("studentId") || "");
  const sessionsToAdd = Number(formData.get("sessions"));
  const price = Number(formData.get("price"));
  const paymentMethod = String(formData.get("paymentMethod") || "cash");

  if (!studentId) return { error: "生徒情報がありません。" };
  if (!Number.isInteger(sessionsToAdd) || sessionsToAdd <= 0) {
    return { error: "チャージ回数は1以上の数字を入力してください。" };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "支払い金額をご確認ください。" };
  }
  if (!["cash", "bank_transfer", "card", "other"].includes(paymentMethod)) {
    return { error: "支払い方法をご確認ください。" };
  }

  await sql.begin(async (tx) => {
    const [existing] = await tx<{ id: string; remaining_sessions: number }[]>`
      select id, remaining_sessions from payment_passes
      where student_id = ${studentId} and status = 'active'
      for update
    `;

    if (existing) {
      await tx`update payment_passes set status = 'completed' where id = ${existing.id}`;
    }

    const carried = existing?.remaining_sessions ?? 0;
    const newRemaining = sessionsToAdd + carried;

    await tx`
      insert into payment_passes (
        student_id, pass_name, total_sessions, remaining_sessions, price,
        payment_method, carried_from_pass_id, carried_sessions
      ) values (
        ${studentId}, ${sessionsToAdd + "回券"}, ${sessionsToAdd}, ${newRemaining}, ${price},
        ${paymentMethod}, ${existing?.id ?? null}, ${carried}
      )
    `;
  });

  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
}
