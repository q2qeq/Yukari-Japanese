"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { signSession } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phone = String(formData.get("phone") || "").replace(/[^0-9]/g, "");
  const password = String(formData.get("password") || "");

  if (!phone || !password) {
    return { error: "전화번호와 비밀번호를 입력해주세요." };
  }

  const rows = await sql<
    { id: string; name: string; role: "owner" | "teacher"; password_hash: string; is_active: boolean }[]
  >`select id, name, role, password_hash, is_active from staff where phone = ${phone}`;
  const staff = rows[0];

  if (!staff || !staff.is_active) {
    return { error: "전화번호 또는 비밀번호가 올바르지 않습니다." };
  }

  const ok = await bcrypt.compare(password, staff.password_hash);
  if (!ok) {
    return { error: "전화번호 또는 비밀번호가 올바르지 않습니다." };
  }

  const token = signSession({
    staffId: staff.id,
    name: staff.name,
    role: staff.role,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
