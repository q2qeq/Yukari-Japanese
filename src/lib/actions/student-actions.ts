"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type StudentFormState = { error?: string } | undefined;

function normalizePhone(raw: FormDataEntryValue | null): string | null {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  return digits || null;
}

function readStudentFields(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const phone = normalizePhone(formData.get("phone"));
  const isMinor = formData.get("isMinor") === "on";
  const guardianName = String(formData.get("guardianName") || "").trim() || null;
  const guardianPhone = normalizePhone(formData.get("guardianPhone"));
  const kakaoFriend = formData.get("kakaoFriend") === "on";
  const level = String(formData.get("level") || "").trim() || null;
  const primaryTeacherId = String(formData.get("primaryTeacherId") || "") || null;
  const status = String(formData.get("status") || "active");
  const memo = String(formData.get("memo") || "").trim() || null;
  const returnTo = String(formData.get("returnTo") || "/students");

  return {
    name,
    phone,
    isMinor,
    guardianName,
    guardianPhone,
    kakaoFriend,
    level,
    primaryTeacherId,
    status,
    memo,
    returnTo,
  };
}

function validate(f: ReturnType<typeof readStudentFields>): string | null {
  if (!f.name) return "이름을 입력해주세요.";
  if (f.isMinor && !f.guardianPhone) return "미성년 학생은 보호자 연락처가 필수입니다.";
  if (!["active", "paused", "withdrawn"].includes(f.status)) return "상태 값을 확인해주세요.";
  return null;
}

export async function createStudent(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const f = readStudentFields(formData);
  const err = validate(f);
  if (err) return { error: err };

  const [row] = await sql<{ id: string }[]>`
    insert into students (
      name, phone, is_minor, guardian_name, guardian_phone,
      kakao_channel_friend, level, primary_teacher_id, status, memo
    ) values (
      ${f.name}, ${f.phone}, ${f.isMinor}, ${f.guardianName}, ${f.guardianPhone},
      ${f.kakaoFriend}, ${f.level}, ${f.primaryTeacherId}, ${f.status}, ${f.memo}
    )
    returning id
  `;

  revalidatePath("/students");
  revalidatePath("/director/students");
  redirect(`${f.returnTo === "/director/students" ? "/director/students" : "/students"}/${row.id}`);
}

export async function updateStudent(
  studentId: string,
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const f = readStudentFields(formData);
  const err = validate(f);
  if (err) return { error: err };

  await sql`
    update students set
      name = ${f.name},
      phone = ${f.phone},
      is_minor = ${f.isMinor},
      guardian_name = ${f.guardianName},
      guardian_phone = ${f.guardianPhone},
      kakao_channel_friend = ${f.kakaoFriend},
      level = ${f.level},
      primary_teacher_id = ${f.primaryTeacherId},
      status = ${f.status},
      memo = ${f.memo}
    where id = ${studentId}
  `;

  revalidatePath("/students");
  revalidatePath("/director/students");
  revalidatePath(`/students/${studentId}`);
  redirect(`${f.returnTo === "/director/students" ? "/director/students" : "/students"}/${studentId}`);
}
