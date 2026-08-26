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
    return { error: "教室長のみ教室を追加できます。" };
  }

  const name = String(formData.get("name") || "").trim();
  const capacityRaw = String(formData.get("capacity") || "");
  const memo = String(formData.get("memo") || "").trim() || null;

  if (!name) return { error: "教室名を入力してください。" };
  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { error: "定員は1以上の数字を入力してください。" };
  }

  const [dup] = await sql<{ id: string }[]>`select id from classrooms where name = ${name}`;
  if (dup) return { error: "すでに存在する教室名です。" };

  await sql`insert into classrooms (name, capacity, memo) values (${name}, ${capacity}, ${memo})`;

  revalidatePath("/director/classrooms");
  return undefined;
}
