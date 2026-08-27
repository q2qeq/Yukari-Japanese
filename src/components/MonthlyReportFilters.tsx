"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { StudentOption, TeacherOption } from "@/lib/queries";

export function MonthlyReportFilters({
  students,
  teachers,
  studentId,
  teacherId,
  month,
}: {
  students: StudentOption[];
  teachers: TeacherOption[];
  studentId: string;
  teacherId: string;
  month: string; // "YYYY-MM" (input[type=month]用)
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(next: Partial<{ studentId: string; teacherId: string; month: string }>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { studentId, teacherId, month, ...next };
    (Object.entries(merged) as [string, string][]).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-line-light p-4">
      <input
        type="month"
        value={month}
        onChange={(e) => update({ month: e.target.value })}
        className="h-9 rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-accent"
      />

      <select
        value={studentId}
        onChange={(e) => update({ studentId: e.target.value })}
        className="h-9 rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-accent bg-white"
      >
        <option value="">生徒：全て</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        value={teacherId}
        onChange={(e) => update({ teacherId: e.target.value })}
        className="h-9 rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-accent bg-white"
      >
        <option value="">先生：全て</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {(studentId || teacherId || month) && (
        <button
          type="button"
          onClick={() => update({ studentId: "", teacherId: "", month: "" })}
          className="text-[11.5px] text-ink-mid font-semibold px-1.5"
        >
          クリア
        </button>
      )}
    </div>
  );
}
