"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { AchievementGrade } from "@/lib/labels";

export type JournalFormState = { error?: string } | undefined;

/**
 * 授業を終える(수업 마치기) 단계: 선생님이 세션의 학생별로 남긴 수업일지(내용 +
 * 성취도 A/B/C)를 한 번에 저장한다. formData는 `content-${studentId}` /
 * `achievement-${studentId}` 형태의 필드로 구성된다(ClassJournalForm 참고).
 * 저장과 함께 이 세션을 completed로 표시한다.
 */
export async function saveClassJournals(
  sessionId: string,
  _prevState: JournalFormState,
  formData: FormData,
): Promise<JournalFormState> {
  const session = await getSession();
  if (!session) return { error: "ログインが必要です。" };

  const entries: { studentId: string; content: string; achievement: AchievementGrade }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("content-")) continue;
    const studentId = key.slice("content-".length);
    const content = String(value).trim();
    if (!content) continue;
    const rawAchievement = String(formData.get(`achievement-${studentId}`) || "B");
    const achievement: AchievementGrade = (["A", "B", "C"] as const).includes(
      rawAchievement as AchievementGrade,
    )
      ? (rawAchievement as AchievementGrade)
      : "B";
    entries.push({ studentId, content, achievement });
  }

  if (entries.length === 0) {
    return { error: "少なくとも1名分の授業内容を入力してください。" };
  }

  await sql.begin(async (tx) => {
    for (const e of entries) {
      await tx`
        insert into class_journals (class_session_id, student_id, teacher_id, content, achievement)
        values (${sessionId}, ${e.studentId}, ${session.staffId}, ${e.content}, ${e.achievement})
        on conflict (class_session_id, student_id)
        do update set content = excluded.content, achievement = excluded.achievement,
                      teacher_id = excluded.teacher_id
      `;
    }
    await tx`
      update class_sessions set status = 'completed'
      where id = ${sessionId} and status != 'canceled'
    `;
  });

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/director/journals");
  revalidatePath("/director");
  redirect("/");
}
