"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type MonthlyReportActionResult = { ok: true } | { ok: false; error: string };

/**
 * 月別管理報告(월별 관리일지)를 저장(신규 작성/수정 겸용, upsert)한다.
 * reportMonth는 "YYYY-MM-01" 형태로 정규화해서 넘겨받는다(호출부에서 처리).
 */
export async function saveMonthlyReport(
  studentId: string,
  reportMonth: string,
  content: string,
): Promise<MonthlyReportActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ログインが必要です。" };

  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "内容を入力してください。" };

  await sql`
    insert into monthly_reports (student_id, teacher_id, report_month, content)
    values (${studentId}, ${session.staffId}, ${reportMonth}::date, ${trimmed})
    on conflict (student_id, report_month)
    do update set content = excluded.content, teacher_id = excluded.teacher_id
  `;

  revalidatePath("/monthly-reports");
  revalidatePath("/director/monthly-reports");
  revalidatePath("/director");
  return { ok: true };
}
