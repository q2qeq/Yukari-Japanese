import { getMonthlyReportsArchive } from "@/lib/director-queries";
import { listAllStudentOptions, listActiveTeachers } from "@/lib/queries";
import { MonthlyReportFilters } from "@/components/MonthlyReportFilters";

function fmtMonth(d: string | Date) {
  return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

export default async function MonthlyReportArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; teacherId?: string; month?: string }>;
}) {
  const { studentId = "", teacherId = "", month = "" } = await searchParams;
  const monthDate = month ? `${month}-01` : "";

  const [reports, students, teachers] = await Promise.all([
    getMonthlyReportsArchive({
      studentId: studentId || undefined,
      teacherId: teacherId || undefined,
      month: monthDate || undefined,
    }),
    listAllStudentOptions(),
    listActiveTeachers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold">月次管理報告アーカイブ</h1>
        <p className="text-[13px] text-ink-mid mt-1">
          先生が毎月初めに作成する生徒別の月次管理報告です。生徒別・月別・先生別に確認できます。
        </p>
      </div>

      <MonthlyReportFilters
        students={students}
        teachers={teachers}
        studentId={studentId}
        teacherId={teacherId}
        month={month}
      />

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-line-light py-16 text-center text-[13px] text-ink-mid">
          条件に一致する月次管理報告がありません。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-line-light p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-bold">{r.student_name}</span>
                <span className="font-mono text-[11.5px] text-ink-mid">{fmtMonth(r.report_month)}</span>
              </div>
              <p className="text-[13px] text-ink whitespace-pre-wrap leading-relaxed">{r.content}</p>
              <span className="text-[11px] text-ink-mid">担当：{r.teacher_name}先生</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
