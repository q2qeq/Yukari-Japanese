"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StudentListRow } from "@/lib/queries";

const STATUS_LABEL: Record<string, string> = {
  active: "在籍",
  paused: "休会",
  withdrawn: "退会",
};

const STATUS_CLASS: Record<string, string> = {
  active: "bg-good-soft text-good",
  paused: "bg-warn-soft text-warn",
  withdrawn: "bg-surface text-ink-mid",
};

export function StudentSearchList({ students }: { students: StudentListRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.name, s.phone ?? "", s.level ?? "", s.primary_teacher_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [students, query]);

  return (
    <>
      <div className="px-5 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前・電話番号・レベルで検索"
          className="w-full h-11 rounded-lg border border-line px-3.5 text-[14px] outline-none focus:border-accent"
        />
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6 gap-2.5">
        {filtered.length === 0 && (
          <p className="text-center text-[13px] text-ink-mid py-10">
            {students.length === 0 ? "登録された生徒がいません。" : "検索結果がありません。"}
          </p>
        )}
        {filtered.map((s) => (
          <div
            key={s.student_id}
            className="border border-line-light rounded-xl p-4 flex items-center justify-between gap-3"
          >
            <Link href={`/students/${s.student_id}`} className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-bold">{s.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_CLASS[s.status]}`}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <span className="text-[12px] text-ink-mid">
                {s.level ?? "レベル未指定"} ・{s.primary_teacher_name ?? "担当未指定"}
              </span>
            </Link>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-mono text-[13px] font-bold">
                {s.remaining_sessions === null ? "–" : `${s.remaining_sessions}回`}
              </span>
              <Link href={`/students/${s.student_id}/edit`} className="text-[11px] text-accent font-semibold">
                編集
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
