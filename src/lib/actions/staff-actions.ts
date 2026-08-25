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
    return { error: "원장만 선생님 계정을 추가할 수 있습니다." };
  }

  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "teacher");
  const phone = normalizePhone(formData.get("phone"));
  const email = String(formData.get("email") || "").trim() || null;
  const password = String(formData.get("password") || "");

  if (!name) return { error: "이름을 입력해주세요." };
  if (!phone) return { error: "전화번호를 입력해주세요." };
  if (!["owner", "teacher"].includes(role)) return { error: "역할을 확인해주세요." };
  if (password.length < 4) return { error: "비밀번호는 4자 이상이어야 합니다." };

  const [dup] = await sql<{ id: string }[]>`select id from staff where phone = ${phone}`;
  if (dup) return { error: "이미 등록된 전화번호입니다." };

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
    return { error: "원장만 선생님 계정을 수정할 수 있습니다." };
  }

  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "teacher");
  const phone = normalizePhone(formData.get("phone"));
  const email = String(formData.get("email") || "").trim() || null;
  const password = String(formData.get("password") || "");
  const isActive = formData.get("isActive") === "on";

  if (!name) return { error: "이름을 입력해주세요." };
  if (!phone) return { error: "전화번호를 입력해주세요." };
  if (!["owner", "teacher"].includes(role)) return { error: "역할을 확인해주세요." };
  if (password && password.length < 4) return { error: "비밀번호는 4자 이상이어야 합니다." };

  const [dup] = await sql<{ id: string }[]>`
    select id from staff where phone = ${phone} and id != ${staffId}
  `;
  if (dup) return { error: "이미 등록된 전화번호입니다." };

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
