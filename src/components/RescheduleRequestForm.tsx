"use client";

import { useActionState, useState } from "react";
import {
  createRescheduleRequest,
  type CreateRescheduleState,
} from "@/lib/actions/reschedule-actions";
import type { UpcomingSessionOption } from "@/lib/queries";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function RescheduleRequestForm({
  studentId,
  options,
}: {
  studentId: string;
  options: UpcomingSessionOption[];
}) {
  const [state, formAction, pending] = useActionState<CreateRescheduleState, FormData>(
    createRescheduleRequest,
    undefined,
  );
  const [selected, setSelected] = useState(options[0]?.session_id ?? "");

  if (options.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-2">
        <p className="text-[14px] font-semibold">延期できる予定の授業がありません</p>
        <p className="text-[12.5px] text-ink-mid">
          この生徒が登録しているクラスの今後の予定授業がないか、すでに延期リクエストが進行中です。
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex-1 flex flex-col">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="classSessionId" value={selected} />

      <div className="flex-1 overflow-auto px-5 pt-3.5 pb-6 flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold text-ink-mid mb-2">延期する授業を選択</p>
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <button
                key={opt.session_id}
                type="button"
                onClick={() => setSelected(opt.session_id)}
                className={`text-left rounded-[10px] border px-3.5 py-3 transition-colors ${
                  selected === opt.session_id
                    ? "border-accent bg-accent-soft"
                    : "border-line-light"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-bold">{opt.class_name}</span>
                  <span className="font-mono text-[12px] text-ink-mid">
                    {opt.start_time.slice(0, 5)}–{opt.end_time.slice(0, 5)}
                  </span>
                </div>
                <span className="text-[12px] text-ink-mid">{fmtDate(opt.session_date)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-mid mb-2">理由（任意）</p>
          <textarea
            name="reason"
            rows={3}
            placeholder="例：生徒の個人的な事情により欠席予定"
            className="w-full border border-line-light rounded-[10px] px-3.5 py-3 text-[13px] outline-none focus:border-accent resize-none"
          />
        </div>

        {state?.error && (
          <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3.5 py-3">
            {state.error}
          </p>
        )}
      </div>

      <div className="px-5 pb-5 pt-3.5 shrink-0">
        <button
          type="submit"
          disabled={pending}
          className="w-full h-12 rounded-lg bg-accent text-white text-[15px] font-semibold disabled:opacity-60"
        >
          {pending ? "リクエスト中..." : "延期リクエストを送る"}
        </button>
      </div>
    </form>
  );
}
