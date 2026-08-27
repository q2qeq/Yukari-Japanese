"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * 教室長ダッシュボードの「最近の支払い」ウィジェットで X を押したときの確認処理。
 * dismissed_at を記録するだけで、支払い自体やレコードは削除しない。
 * 支払い履歴（/director/payments、全件）画面には影響しない。
 */
export async function dismissPayment(passId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { ok: false, error: "権限がありません。" };
  }

  await sql`update payment_passes set dismissed_at = now() where id = ${passId}`;
  revalidatePath("/director");
  return { ok: true };
}
