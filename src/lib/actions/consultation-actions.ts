"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type ConsultationStatus = "new" | "contacted" | "trial_scheduled" | "converted" | "lost";
export type ConsultationSource =
  | "kakao_channel"
  | "phone"
  | "walk_in"
  | "referral"
  | "online_form"
  | "other";

const STATUSES: ConsultationStatus[] = [
  "new",
  "contacted",
  "trial_scheduled",
  "converted",
  "lost",
];
const SOURCES: ConsultationSource[] = [
  "kakao_channel",
  "phone",
  "walk_in",
  "referral",
  "online_form",
  "other",
];

export type CreateConsultationState = { error?: string } | undefined;

export async function createConsultation(
  _prevState: CreateConsultationState,
  formData: FormData,
): Promise<CreateConsultationState> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { error: "権限がありません。" };
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const source = String(formData.get("source") || "other");
  const interestedLevel = String(formData.get("interestedLevel") || "").trim();
  const followUpAt = String(formData.get("followUpAt") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) return { error: "名前を入力してください。" };
  if (!SOURCES.includes(source as ConsultationSource)) {
    return { error: "流入経路をご確認ください。" };
  }

  await sql`
    insert into consultations (name, phone, source, interested_level, follow_up_at, notes)
    values (
      ${name}, ${phone || null}, ${source}, ${interestedLevel || null},
      ${followUpAt || null}, ${notes || null}
    )
  `;

  revalidatePath("/director/consultations");
  revalidatePath("/director");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { ok: false, error: "権限がありません。" };
  }
  if (!STATUSES.includes(status)) {
    return { ok: false, error: "無効なステータスです。" };
  }

  await sql`update consultations set status = ${status} where id = ${id}`;
  revalidatePath("/director/consultations");
  revalidatePath("/director");
  return { ok: true };
}

export async function updateConsultationNotes(
  id: string,
  notes: string,
  followUpAt: string | null,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { ok: false, error: "権限がありません。" };
  }

  await sql`
    update consultations
    set notes = ${notes || null}, follow_up_at = ${followUpAt || null}
    where id = ${id}
  `;
  revalidatePath("/director/consultations");
  return { ok: true };
}
