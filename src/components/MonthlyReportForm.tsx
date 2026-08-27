"use client";

import { useState, useTransition } from "react";
import { saveMonthlyReport } from "@/lib/actions/monthly-report-actions";
import type { MyStudentReportRow } from "@/lib/queries";

function StudentReportCard({
  row,
  reportMonth,
}: {
  row: MyStudentReportRow;
  reportMonth: string;
}) {
  const [content, setContent] = useState(row.report_content ?? "");
  const [saved, setSaved] = useState(!!row.report_content);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveMonthlyReport(row.student_id, reportMonth, content);
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border border-line-light rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold">{row.student_name}</span>
          <span className="text-[11.5px] text-ink-mid">{row.level ?? "レベル未指定"}</span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            saved ? "bg-good-soft text-good" : "bg-surface text-ink-mid"
          }`}
        >
          {saved ? "作成済み" : "未作成"}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSaved(false);
        }}
        rows={4}
        placeholder="今月の学習内容・様子を5〜6文程度で記録してください"
        className="rounded-lg border border-line-light px-3 py-2.5 text-[13px] outline-none focus:border-accent resize-none"
      />
      {error && <p className="text-[12px] text-critical">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={pending || !content.trim()}
        className="self-end h-9 rounded-lg bg-accent text-white text-[12.5px] font-bold px-4 disabled:opacity-50"
      >
        {pending ? "保存中..." : "保存"}
      </button>
    </div>
  );
}

export function MonthlyReportForm({
  students,
  reportMonth,
}: {
  students: MyStudentReportRow[];
  reportMonth: string;
}) {
  if (students.length === 0) {
    return (
      <p className="text-center text-[13px] text-ink-mid py-10 px-5">
        担当している在籍生徒がいません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 px-5 pb-8">
      {students.map((s) => (
        <StudentReportCard key={s.student_id} row={s} reportMonth={reportMonth} />
      ))}
    </div>
  );
}
