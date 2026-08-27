"use client";

import { useActionState } from "react";
import { saveClassJournals, type JournalFormState } from "@/lib/actions/journal-actions";
import { ACHIEVEMENT_OPTIONS, ACHIEVEMENT_LABEL } from "@/lib/labels";
import type { RosterRow } from "@/lib/types";
import type { JournalDraftRow } from "@/lib/queries";

export function ClassJournalForm({
  sessionId,
  roster,
  drafts,
}: {
  sessionId: string;
  roster: RosterRow[];
  drafts: JournalDraftRow[];
}) {
  const draftMap = new Map(drafts.map((d) => [d.student_id, d]));
  const action = saveClassJournals.bind(null, sessionId);
  const [state, formAction, pending] = useActionState<JournalFormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto px-5 py-3 flex flex-col gap-4">
        <p className="text-[12.5px] text-ink-mid">
          出席チェックが終わった生徒から、授業内容と達成度を記録してください（内容が空欄の生徒は保存されません）。
        </p>
        {roster.map((r) => {
          const d = draftMap.get(r.student_id);
          return (
            <div key={r.student_id} className="border border-line-light rounded-xl p-4 flex flex-col gap-2.5">
              <span className="text-[14px] font-bold">{r.name}</span>
              <textarea
                name={`content-${r.student_id}`}
                defaultValue={d?.content ?? ""}
                rows={3}
                placeholder="授業内容を記録してください（例：第5課の文型を練習、来週小テスト予定）"
                className="rounded-lg border border-line-light px-3 py-2.5 text-[13px] outline-none focus:border-accent resize-none"
              />
              <div className="flex gap-2">
                {ACHIEVEMENT_OPTIONS.map((g) => (
                  <label key={g} className="flex-1 cursor-pointer" title={ACHIEVEMENT_LABEL[g]}>
                    <input
                      type="radio"
                      name={`achievement-${r.student_id}`}
                      value={g}
                      defaultChecked={(d?.achievement ?? "B") === g}
                      className="peer sr-only"
                    />
                    <span className="peer-checked:bg-accent peer-checked:text-white peer-checked:border-accent block text-center rounded-lg border border-line py-2 text-[12.5px] font-bold text-ink-mid">
                      {g}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {state?.error && (
        <p className="mx-5 mb-2 text-[13px] text-critical bg-critical-soft rounded-lg px-3.5 py-3">
          {state.error}
        </p>
      )}

      <div className="px-5 pb-5 pt-3 shrink-0">
        <button
          type="submit"
          disabled={pending}
          className="w-full h-12 rounded-lg bg-accent text-white text-[15px] font-semibold disabled:opacity-60"
        >
          {pending ? "保存中..." : "保存してホームへ"}
        </button>
      </div>
    </form>
  );
}
