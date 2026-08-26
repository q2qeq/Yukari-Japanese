"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type EnrollState = { error?: string } | undefined;

/**
 * 반에 학생을 등록한다. class_enrollments에는 (student_id, class_id)가
 * status='active'인 행이 최대 1개만 존재할 수 있으므로(uq_active_enrollment),
 * 예전에 등록했다가 뺀(inactive) 이력이 있으면 그 행을 다시 active로 되돌리고,
 * 처음 등록이면 새 행을 만든다.
 */
export async function enrollStudent(
  classId: string,
  _prevState: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  const session = await getSession();
  if (!session) return { error: "ログインが必要です。" };

  const studentId = String(formData.get("studentId") || "");
  if (!studentId) return { error: "登録する生徒を選択してください。" };

  const [cls] = await sql<{ id: string }[]>`select id from classes where id = ${classId}`;
  if (!cls) return { error: "クラス情報が見つかりません。" };

  const [existing] = await sql<{ id: string; status: string }[]>`
    select id, status from class_enrollments
    where class_id = ${classId} and student_id = ${studentId}
    order by created_at desc
    limit 1
  `;

  if (existing?.status === "active") {
    return { error: "すでにこのクラスに登録されている生徒です。" };
  }

  if (existing) {
    await sql`
      update class_enrollments
      set status = 'active', enrolled_at = current_date, left_at = null
      where id = ${existing.id}
    `;
  } else {
    await sql`
      insert into class_enrollments (student_id, class_id)
      values (${studentId}, ${classId})
    `;
  }

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/schedule");
  revalidatePath("/director/schedule");
  revalidatePath("/director/classrooms");
  revalidatePath(`/students/${studentId}`);
  return undefined;
}

export type UnenrollResult = { ok: true } | { ok: false; error: string };

/** 반에서 학생을 제외한다. 출석 이력 보존을 위해 행을 지우지 않고 inactive로만 바꾼다. */
export async function unenrollStudent(classId: string, studentId: string): Promise<UnenrollResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ログインが必要です。" };

  await sql`
    update class_enrollments
    set status = 'inactive', left_at = current_date
    where class_id = ${classId} and student_id = ${studentId} and status = 'active'
  `;

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/schedule");
  revalidatePath("/director/schedule");
  revalidatePath("/director/classrooms");
  revalidatePath(`/students/${studentId}`);
  return { ok: true };
}
