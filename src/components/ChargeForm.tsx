"use client";

import { useActionState, useState } from "react";
import { chargeSessions, type ChargeState } from "@/lib/actions/charge-actions";

type PaymentMethod = "cash" | "bank_transfer";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "현금",
  bank_transfer: "계좌이체",
};

export function ChargeForm({
  studentId,
  studentName,
  currentRemaining,
}: {
  studentId: string;
  studentName: string;
  currentRemaining: number | null;
}) {
  const [state, formAction, pending] = useActionState<ChargeState, FormData>(
    chargeSessions,
    undefined,
  );
  const [sessions, setSessions] = useState(10);
  const [price, setPrice] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const carried = currentRemaining ?? 0;
  const isDebt = carried < 0;
  const afterRemaining = sessions + carried;

  return (
    <form action={formAction} className="flex-1 flex flex-col">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="sessions" value={sessions} />
      <input type="hidden" name="price" value={price} />
      <input type="hidden" name="paymentMethod" value={method} />

      <div className="flex-1 overflow-auto px-5 pt-3.5 pb-6 flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold text-ink-mid mb-2">대상 학생</p>
          <div className="border border-line-light rounded-[10px] p-3.5 bg-surface flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDebt ? "bg-critical-soft text-critical" : "bg-white text-ink-mid"
                }`}
              >
                {studentName.slice(0, 1)}
              </div>
              <span className="text-[14.5px] font-bold">{studentName}</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                isDebt ? "bg-critical-soft text-critical" : "bg-white text-ink-mid"
              }`}
            >
              {currentRemaining === null
                ? "수강권 없음"
                : isDebt
                  ? `현재 ${currentRemaining}회 (외상)`
                  : `현재 ${currentRemaining}회`}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-mid mb-2">충전 회차</p>
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => setSessions((s) => Math.max(1, s - 1))}
              aria-label="회차 감소"
              className="w-11 h-11 rounded-[10px] border border-line flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
              </svg>
            </button>
            <div className="font-mono text-[30px] font-extrabold min-w-16 text-center">
              {sessions}
              <span className="text-[15px] font-semibold text-ink-mid">회</span>
            </div>
            <button
              type="button"
              onClick={() => setSessions((s) => s + 1)}
              aria-label="회차 증가"
              className="w-11 h-11 rounded-[10px] border border-line flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-mid mb-2">결제 금액</p>
          <div className="h-12 border border-line rounded-lg flex items-center px-3.5 gap-1.5">
            <span className="font-mono text-[16px] font-bold text-ink-mid">₩</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="font-mono text-[16px] font-bold outline-none flex-1 min-w-0"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-mid mb-2">결제 수단</p>
          <div className="flex rounded-[10px] border border-line overflow-hidden">
            {(["cash", "bank_transfer"] as PaymentMethod[]).map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 h-[42px] text-[13px] font-bold ${
                  i === 1 ? "border-l border-line" : ""
                } ${method === m ? "bg-accent text-white" : "text-ink-mid"}`}
              >
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-accent-soft p-4 flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-accent">자동 정산 미리보기</p>
          {isDebt ? (
            <p className="text-[13px] text-accent">
              기존 외상 {carried}회가 자동으로 차감되고,
            </p>
          ) : carried > 0 ? (
            <p className="text-[13px] text-accent">기존 잔여 {carried}회가 이월되고,</p>
          ) : (
            <p className="text-[13px] text-accent">기존 잔여 없이 새로 시작하며,</p>
          )}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[12.5px] text-accent">충전 후 잔여</span>
            <span className="font-mono text-[22px] font-extrabold text-accent">
              {afterRemaining}회
            </span>
            <span className="text-xs text-accent/70">
              ({sessions} {carried >= 0 ? "+" : "−"} {Math.abs(carried)})
            </span>
          </div>
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
          {pending ? "처리 중..." : "충전 완료"}
        </button>
      </div>
    </form>
  );
}
