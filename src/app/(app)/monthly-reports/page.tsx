import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMyStudentsForMonthlyReport } from "@/lib/queries";
import { MonthlyReportForm } from "@/components/MonthlyReportForm";

function currentMonthStart(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function MonthlyReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "owner") redirect("/director");

  const reportMonth = currentMonthStart();
  const students = await getMyStudentsForMonthlyReport(session.staffId, reportMonth);
  const doneCount = students.filter((s) => s.report_content).length;

  const monthLabel = new Date(reportMonth).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-[16.5px] font-bold">月次管理報告</h1>
        <p className="text-[12.5px] text-ink-mid mt-1">
          {monthLabel} ・ {students.length}名中 {doneCount}名作成済み
        </p>
      </div>
      <MonthlyReportForm students={students} reportMonth={reportMonth} />
    </div>
  );
}
