"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type StaffFormState = { error?: string } | undefined;

function normalizePhone(raw: FormDataEntryValue | null): string {
  return String(raw || "").replace(/[^0-9]/g, "");
}

export async function createStaff(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { error: "教室長のみ先生アカウントを追加できます。" };
  }

  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "teacher");
  const phone = normalizePhone(formData.get("phone"));
  const email = String(formData.get("email") || "").trim() || null;
  const password = String(formData.get("password") || "");

  if (!name) return { error: "名前を入力してください。" };
  if (!phone) return { error: "電話番号を入力してください。" };
  if (!["owner", "teacher"].includes(role)) return { error: "役割をご確認ください。" };
  if (password.length < 4) return { error: "パスワードは4文字以上にしてください。" };

  const [dup] = await sql<{ id: string }[]>`select id from staff where phone = ${phone}`;
  if (dup) return { error: "すでに登録されている電話番号です。" };

  const passwordHash = await bcrypt.hash(password, 10);

  await sql`
    insert into staff (name, role, phone, email, password_hash)
    values (${name}, ${role}, ${phone}, ${email}, ${passwordHash})
  `;

  revalidatePath("/director/staff");
  redirect("/director/staff");
}

export async function updateStaff(
  staffId: string,
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { error: "教室長のみ先生アカウントを編集できます。" };
  }

  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "teacher");
  const phone = normalizePhone(formData.get("phone"));
  const email = String(formData.get("email") || "").trim() || null;
  const password = String(formData.get("password") || "");
  const isActive = formData.get("isActive") === "on";

  if (!name) return { error: "名前を入力してください。" };
  if (!phone) return { error: "電話番号を入力してください。" };
  if (!["owner", "teacher"].includes(role)) return { error: "役割をご確認ください。" };
  if (password && password.length < 4) return { error: "パスワードは4文字以上にしてください。" };

  const [dup] = await sql<{ id: string }[]>`
    select id from staff where phone = ${phone} and id != ${staffId}
  `;
  if (dup) return { error: "すでに登録されている電話番号です。" };

  if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await sql`
      update staff set name = ${name}, role = ${role}, phone = ${phone},
        email = ${email}, password_hash = ${passwordHash}, is_active = ${isActive}
      where id = ${staffId}
    `;
  } else {
    await sql`
      update staff set name = ${name}, role = ${role}, phone = ${phone},
        email = ${email}, is_active = ${isActive}
      where id = ${staffId}
    `;
  }

  revalidatePath("/director/staff");
  redirect("/director/staff");
}

export type PayRateActionResult = { ok: true } | { ok: false; error: string };

/** 給料計算機で使う先生の「セッション当たり単価」を保存(선택 입력, 원장 전용). */
export async function updatePayRate(staffId: string, rate: number): Promise<PayRateActionResult> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { ok: false, error: "権限がありません。" };
  }
  if (!Number.isFinite(rate) || rate < 0) {
    return { ok: false, error: "単価をご確認ください。" };
  }

  await sql`update staff set pay_rate_per_session = ${Math.round(rate)} where id = ${staffId}`;
  revalidatePath(`/director/staff/${staffId}`);
  return { ok: true };
}
