"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { OCCUPATION_OPTIONS, STUDY_PURPOSE_OPTIONS } from "@/lib/labels";

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
  const occupation = String(formData.get("occupation") || "") || null;
  const studyPurpose = String(formData.get("studyPurpose") || "") || null;
  const currentTextbook = String(formData.get("currentTextbook") || "").trim() || null;
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
    occupation,
    studyPurpose,
    currentTextbook,
    memo,
    returnTo,
  };
}

function validate(f: ReturnType<typeof readStudentFields>): string | null {
  if (!f.name) return "名前を入力してください。";
  if (f.isMinor && !f.guardianPhone) return "未成年の生徒は保護者の連絡先が必須です。";
  if (!["active", "paused", "withdrawn"].includes(f.status)) return "ステータスをご確認ください。";
  if (f.occupation && !OCCUPATION_OPTIONS.includes(f.occupation as (typeof OCCUPATION_OPTIONS)[number])) {
    return "職業をご確認ください。";
  }
  if (
    f.studyPurpose &&
    !STUDY_PURPOSE_OPTIONS.includes(f.studyPurpose as (typeof STUDY_PURPOSE_OPTIONS)[number])
  ) {
    return "受講目的をご確認ください。";
  }
  return null;
}

export async function createStudent(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const session = await getSession();
  if (!session) return { error: "ログインが必要です。" };

  const f = readStudentFields(formData);
  const err = validate(f);
  if (err) return { error: err };

  const [row] = await sql<{ id: string }[]>`
    insert into students (
      name, phone, is_minor, guardian_name, guardian_phone,
      kakao_channel_friend, level, primary_teacher_id, status,
      occupation, study_purpose, current_textbook, memo
    ) values (
      ${f.name}, ${f.phone}, ${f.isMinor}, ${f.guardianName}, ${f.guardianPhone},
      ${f.kakaoFriend}, ${f.level}, ${f.primaryTeacherId}, ${f.status},
      ${f.occupation}, ${f.studyPurpose}, ${f.currentTextbook}, ${f.memo}
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
  if (!session) return { error: "ログインが必要です。" };

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
      occupation = ${f.occupation},
      study_purpose = ${f.studyPurpose},
      current_textbook = ${f.currentTextbook},
      memo = ${f.memo}
    where id = ${studentId}
  `;

  revalidatePath("/students");
  revalidatePath("/director/students");
  revalidatePath(`/students/${studentId}`);
  redirect(`${f.returnTo === "/director/students" ? "/director/students" : "/students"}/${studentId}`);
}
