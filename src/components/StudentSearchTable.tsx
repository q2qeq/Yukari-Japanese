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

export function StudentSearchTable({ students }: { students: StudentListRow[] }) {
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
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="名前・電話番号・レベル・担当の先生で検索"
        className="w-full max-w-sm h-11 rounded-lg border border-line px-3.5 text-[14px] outline-none focus:border-accent bg-white"
      />

      <div className="bg-white rounded-2xl border border-line-light overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line-light text-left text-ink-mid text-[12px]">
              <th className="px-5 py-3 font-semibold">名前</th>
              <th className="px-5 py-3 font-semibold">電話番号</th>
              <th className="px-5 py-3 font-semibold">レベル</th>
              <th className="px-5 py-3 font-semibold">担当の先生</th>
              <th className="px-5 py-3 font-semibold">ステータス</th>
              <th className="px-5 py-3 font-semibold">残り</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-ink-mid">
                  {students.length === 0 ? "登録された生徒がいません。" : "検索結果がありません。"}
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.student_id} className="border-b border-line-light last:border-none">
                <td className="px-5 py-3.5 font-semibold">{s.name}</td>
                <td className="px-5 py-3.5 font-mono text-ink-mid">{s.phone ?? "-"}</td>
                <td className="px-5 py-3.5">{s.level ?? "-"}</td>
                <td className="px-5 py-3.5">{s.primary_teacher_name ?? "未指定"}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${STATUS_CLASS[s.status]}`}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono">
                  {s.remaining_sessions === null ? "-" : `${s.remaining_sessions}回`}
                </td>
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  <Link href={`/students/${s.student_id}`} className="text-accent font-semibold mr-3">
                    詳細
                  </Link>
                  <Link href={`/director/students/${s.student_id}/edit`} className="text-ink-mid font-semibold">
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
