import { getClassJournalsArchive } from "@/lib/director-queries";
import { listAllStudentOptions, listActiveTeachers } from "@/lib/queries";
import { JournalFilters } from "@/components/JournalFilters";
import { ACHIEVEMENT_BADGE_CLASS } from "@/lib/labels";

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

export default async function JournalArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; teacherId?: string; from?: string; to?: string }>;
}) {
  const { studentId = "", teacherId = "", from = "", to = "" } = await searchParams;

  const [journals, students, teachers] = await Promise.all([
    getClassJournalsArchive({
      studentId: studentId || undefined,
      teacherId: teacherId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    listAllStudentOptions(),
    listActiveTeachers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold">授業日誌アーカイブ</h1>
        <p className="text-[13px] text-ink-mid mt-1">
          先生が出席チェック後に記録した授業内容と達成度です。生徒別・日付別・先生別に確認できます。
        </p>
      </div>

      <JournalFilters
        students={students}
        teachers={teachers}
        studentId={studentId}
        teacherId={teacherId}
        from={from}
        to={to}
      />

      {journals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-line-light py-16 text-center text-[13px] text-ink-mid">
          条件に一致する授業日誌がありません。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {journals.map((j) => (
            <div key={j.id} className="bg-white rounded-2xl border border-line-light p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[14px] font-bold">{j.student_name}</span>
                  <span className="text-[12px] text-ink-mid">{j.class_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ACHIEVEMENT_BADGE_CLASS[j.achievement]}`}
                  >
                    達成度 {j.achievement}
                  </span>
                  <span className="font-mono text-[11.5px] text-ink-mid">{fmtDate(j.session_date)}</span>
                </div>
              </div>
              <p className="text-[13px] text-ink whitespace-pre-wrap">{j.content}</p>
              <span className="text-[11px] text-ink-mid">担当：{j.teacher_name}先生</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
