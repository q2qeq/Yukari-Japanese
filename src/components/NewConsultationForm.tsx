"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createConsultation,
  type CreateConsultationState,
} from "@/lib/actions/consultation-actions";

const SOURCE_LABEL: Record<string, string> = {
  kakao_channel: "カカオチャンネル",
  phone: "電話",
  walk_in: "来校",
  referral: "紹介",
  online_form: "オンラインフォーム",
  other: "その他",
};

export function NewConsultationForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CreateConsultationState, FormData>(
    createConsultation,
    undefined,
  );
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false;
      if (!state?.error) setOpen(false);
    }
  }, [pending, state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-lg bg-accent text-white text-[13.5px] font-semibold px-4 py-2.5"
      >
        + 新規相談登録
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        submittedRef.current = true;
        formAction(fd);
      }}
      className="bg-white rounded-2xl border border-line-light p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[14.5px] font-bold">新規相談登録</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12.5px] text-ink-mid font-semibold"
        >
          キャンセル
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">名前 *</label>
          <input
            name="name"
            required
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">電話番号</label>
          <input
            name="phone"
            type="tel"
            placeholder="010-0000-0000"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">流入経路</label>
          <select
            name="source"
            defaultValue="other"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent bg-white"
          >
            {Object.entries(SOURCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">興味レベル</label>
          <input
            name="interestedLevel"
            placeholder="例：初級"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">フォローアップ日</label>
          <input
            name="followUpAt"
            type="date"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-xs font-semibold text-ink-mid">メモ</label>
          <textarea
            name="notes"
            rows={2}
            className="rounded-lg border border-line px-3 py-2 text-[13.5px] outline-none focus:border-accent resize-none"
          />
        </div>
      </div>

      {state?.error && <p className="text-[13px] text-critical">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit h-10 rounded-lg bg-accent text-white text-[13.5px] font-semibold px-5 disabled:opacity-60"
      >
        {pending ? "登録中..." : "登録"}
      </button>
    </form>
  );
}
