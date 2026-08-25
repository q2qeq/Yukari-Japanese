"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createConsultation,
  type CreateConsultationState,
} from "@/lib/actions/consultation-actions";

const SOURCE_LABEL: Record<string, string> = {
  kakao_channel: "카카오 채널",
  phone: "전화",
  walk_in: "방문",
  referral: "지인 소개",
  online_form: "온라인 폼",
  other: "기타",
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
        + 신규 상담 등록
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
        <h2 className="text-[14.5px] font-bold">신규 상담 등록</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12.5px] text-ink-mid font-semibold"
        >
          취소
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">이름 *</label>
          <input
            name="name"
            required
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">전화번호</label>
          <input
            name="phone"
            type="tel"
            placeholder="010-0000-0000"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">유입 경로</label>
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
          <label className="text-xs font-semibold text-ink-mid">관심 레벨</label>
          <input
            name="interestedLevel"
            placeholder="예: 초급"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">후속 연락일</label>
          <input
            name="followUpAt"
            type="date"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-xs font-semibold text-ink-mid">메모</label>
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
        {pending ? "등록 중..." : "등록"}
      </button>
    </form>
  );
}
