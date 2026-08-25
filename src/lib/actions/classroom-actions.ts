"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type ClassroomFormState = { error?: string } | undefined;

export async function createClassroom(
  _prevState: ClassroomFormState,
  formData: FormData,
): Promise<ClassroomFormState> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { error: "원장만 강의실을 추가할 수 있습니다." };
  }

  const name = String(formData.get("name") || "").trim();
  const capacityRaw = String(formData.get("capacity") || "");
  const memo = String(formData.get("memo") || "").trim() || null;

  if (!name) return { error: "강의실 이름을 입력해주세요." };
  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { error: "정원은 1 이상의 숫자여야 합니다." };
  }

  const [dup] = await sql<{ id: string }[]>`select id from classrooms where name = ${name}`;
  if (dup) return { error: "이미 있는 강의실 이름입니다." };

  await sql`insert into classrooms (name, capacity, memo) values (${name}, ${capacity}, ${memo})`;

  revalidatePath("/director/classrooms");
  return undefined;
}
