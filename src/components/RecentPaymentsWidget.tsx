"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { dismissPayment } from "@/lib/actions/payment-actions";
import { PAYMENT_METHOD_LABEL, cardNetAmount } from "@/lib/labels";
import type { PaymentHistoryRow } from "@/lib/director-queries";

function fmtWon(n: number) {
  return n.toLocaleString("ja-JP") + "ウォン";
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
}

export function RecentPaymentsWidget({ initialRows }: { initialRows: PaymentHistoryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [, startTransition] = useTransition();

  function handleDismiss(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => {
      dismissPayment(id);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-center text-[13px] text-ink-mid py-10">
        確認していない支払いはありません。
      </p>
    );
  }

  return (
    <div className="divide-y divide-line-light">
      {rows.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-[12px] text-ink-mid shrink-0">{fmtDate(p.purchased_at)}</span>
            <Link href={`/students/${p.student_id}`} className="text-[13.5px] font-semibold hover:text-accent truncate">
              {p.student_name}
            </Link>
            <span className="text-[11.5px] text-ink-mid shrink-0">{p.primary_teacher_name ?? "未指定"}先生</span>
            <span className="rounded-full bg-surface text-ink-mid px-2 py-0.5 text-[10.5px] font-semibold shrink-0">
              {PAYMENT_METHOD_LABEL[p.payment_method] ?? p.payment_method}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-[13px] font-bold">{fmtWon(cardNetAmount(p.price, p.payment_method))}</span>
            <button
              type="button"
              onClick={() => handleDismiss(p.id)}
              aria-label="確認済みにする"
              title="確認済みにする"
              className="w-6 h-6 rounded-full border border-line text-ink-mid text-[12px] font-bold flex items-center justify-center hover:bg-surface"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
