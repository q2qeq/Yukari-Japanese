"use client";

import { useState, useTransition } from "react";
import { sendBalanceNotification } from "@/lib/actions/notification-actions";

export function NotifyButton({
  studentId,
  kind,
}: {
  studentId: string;
  kind: "low_balance" | "payment_overdue";
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await sendBalanceNotification(studentId, kind);
      setResult(res.ok ? { ok: true, message: res.message } : { ok: false, message: res.error });
    });
  }

  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-full h-11 rounded-lg border border-line text-ink text-[13px] font-bold disabled:opacity-60"
      >
        {pending ? "발송 중..." : "알림 보내기"}
      </button>
      {result && (
        <p className={`text-[11px] leading-snug ${result.ok ? "text-ink-mid" : "text-critical"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
