"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { unenrollStudent } from "@/lib/actions/enrollment-actions";
import type { ClassRosterRow } from "@/lib/queries";

function balanceChip(remaining: number | null) {
  if (remaining === null) return { label: "受講パスなし", className: "bg-surface text-ink-mid" };
  if (remaining <= 0) return { label: `${remaining}回分未払い`, className: "bg-critical-soft text-critical" };
  if (remaining <= 2) return { label: `残り${remaining}回`, className: "bg-warn-soft text-warn" };
  return { label: `残り${remaining}回`, className: "bg-surface text-ink-mid" };
}

export function ClassRoster({
  classId,
  initialRoster,
}: {
  classId: string;
  initialRoster: ClassRosterRow[];
}) {
  const [roster, setRoster] = useState(initialRoster);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRemove(studentId: string, name: string) {
    if (typeof window !== "undefined" && !window.confirm(`${name}さんをこのクラスから除外しますか？`)) {
      return;
    }
    setPendingId(studentId);
    startTransition(async () => {
      const result = await unenrollStudent(classId, studentId);
      setPendingId(null);
      if (result.ok) {
        setRoster((prev) => prev.filter((r) => r.student_id !== studentId));
      }
    });
  }

  if (roster.length === 0) {
    return (
      <p className="text-[12.5px] text-ink-mid bg-surface rounded-xl px-4 py-3">
        まだ登録された生徒がいません。下から生徒を登録してみましょう。
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {roster.map((row) => {
        const chip = balanceChip(row.remaining_sessions);
        return (
          <div
            key={row.student_id}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-line-light last:border-none"
          >
            <Link href={`/students/${row.student_id}`} className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-ink-mid shrink-0">
                {row.name.slice(0, 1)}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold truncate">{row.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${chip.className}`}
                  >
                    {chip.label}
                  </span>
                </div>
                {row.current_textbook && (
                  <span className="text-[11px] text-ink-mid truncate">教材：{row.current_textbook}</span>
                )}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => handleRemove(row.student_id, row.name)}
              disabled={pendingId === row.student_id}
              className="shrink-0 text-[12px] text-ink-mid font-semibold disabled:opacity-50"
            >
              {pendingId === row.student_id ? "処理中..." : "除外"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
