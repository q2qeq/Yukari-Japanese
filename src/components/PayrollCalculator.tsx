"use client";

import { useMemo, useState, useTransition } from "react";
import { updatePayRate } from "@/lib/actions/staff-actions";
import type { TeacherMonthlyAttendanceRow } from "@/lib/director-queries";

export function PayrollCalculator({
  staffId,
  initialRate,
  attendance,
  monthLabel,
}: {
  staffId: string;
  initialRate: number | null;
  attendance: TeacherMonthlyAttendanceRow[];
  monthLabel: string;
}) {
  const [rate, setRate] = useState(initialRate ?? 0);
  const [saved, setSaved] = useState(true);
  const [pending, startTransition] = useTransition();

  const totalSessions = useMemo(
    () => attendance.reduce((sum, a) => sum + a.present_count, 0),
    [attendance],
  );
  const totalPay = rate * totalSessions;

  function handleSaveRate() {
    startTransition(async () => {
      const result = await updatePayRate(staffId, rate);
      if (result.ok) setSaved(true);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-line-light p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">給料計算機</h2>
        <span className="text-[12px] text-ink-mid">{monthLabel} の出席（present）回数を集計</span>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">セッション単価（ウォン）</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1000}
              value={rate}
              onChange={(e) => {
                setRate(Number(e.target.value) || 0);
                setSaved(false);
              }}
              className="h-10 w-36 rounded-lg border border-line px-3 text-[14px] font-mono outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleSaveRate}
              disabled={pending || saved}
              className="h-10 rounded-lg border border-line text-[12.5px] font-semibold px-3 disabled:opacity-50"
            >
              {pending ? "保存中..." : saved ? "保存済み" : "単価を保存"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-ink-mid">出席合計</span>
          <span className="font-mono text-[18px] font-bold h-10 flex items-center">{totalSessions}回</span>
        </div>

        <div className="flex flex-col gap-1.5 ml-auto">
          <span className="text-xs font-semibold text-accent">支給額合計</span>
          <span className="font-mono text-[22px] font-extrabold text-accent h-10 flex items-center">
            {totalPay.toLocaleString("ja-JP")}ウォン
          </span>
        </div>
      </div>

      {attendance.length > 0 && (
        <div className="border-t border-line-light pt-3 flex flex-col gap-1.5">
          {attendance.map((a) => (
            <div key={a.student_id} className="flex items-center justify-between text-[12.5px]">
              <span className="text-ink-mid">{a.student_name}</span>
              <span className="font-mono font-semibold">{a.present_count}回</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
