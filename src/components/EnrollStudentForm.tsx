"use client";

import { useActionState } from "react";
import { enrollStudent, type EnrollState } from "@/lib/actions/enrollment-actions";
import type { EnrollableStudent } from "@/lib/queries";

export function EnrollStudentForm({
  classId,
  students,
}: {
  classId: string;
  students: EnrollableStudent[];
}) {
  const action = enrollStudent.bind(null, classId);
  const [state, formAction, pending] = useActionState<EnrollState, FormData>(action, undefined);

  if (students.length === 0) {
    return (
      <p className="text-[12.5px] text-ink-mid bg-surface rounded-xl px-4 py-3">
        登録できる在籍生徒がいません。生徒管理で先に生徒を追加してください。
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <select
          name="studentId"
          required
          defaultValue=""
          className="h-11 flex-1 min-w-0 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent bg-white"
        >
          <option value="" disabled>
            生徒を選択（入力して検索できます）
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.level ? ` · ${s.level}` : ""}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-lg bg-accent text-white text-[13.5px] font-semibold px-4 disabled:opacity-60"
        >
          {pending ? "登録中..." : "登録"}
        </button>
      </div>
      {state?.error && (
        <p className="text-[12.5px] text-critical bg-critical-soft rounded-lg px-3.5 py-2.5">
          {state.error}
        </p>
      )}
    </form>
  );
}
