"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PAYMENT_METHOD_LABEL, type PaymentMethodFull } from "@/lib/labels";

const METHODS: PaymentMethodFull[] = ["cash", "bank_transfer", "card"];

export function PaymentFilters({
  from,
  to,
  method,
}: {
  from: string;
  to: string;
  method: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(next: { from?: string; to?: string; method?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { from, to, method, ...next };
    if (merged.from) params.set("from", merged.from);
    else params.delete("from");
    if (merged.to) params.set("to", merged.to);
    else params.delete("to");
    if (merged.method) params.set("method", merged.method);
    else params.delete("method");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-line-light p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-ink-mid">期間</span>
        <input
          type="date"
          value={from}
          onChange={(e) => update({ from: e.target.value })}
          className="h-9 rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-accent"
        />
        <span className="text-ink-mid text-[12px]">〜</span>
        <input
          type="date"
          value={to}
          onChange={(e) => update({ to: e.target.value })}
          className="h-9 rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-accent"
        />
        {(from || to) && (
          <button
            type="button"
            onClick={() => update({ from: "", to: "" })}
            className="text-[11.5px] text-ink-mid font-semibold px-1.5"
          >
            クリア
          </button>
        )}
      </div>

      <div className="flex rounded-lg border border-line overflow-hidden">
        <button
          type="button"
          onClick={() => update({ method: "" })}
          className={`h-9 px-3 text-[12.5px] font-bold ${method === "" ? "bg-ink text-white" : "text-ink-mid"}`}
        >
          全て
        </button>
        {METHODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => update({ method: m })}
            className={`h-9 px-3 text-[12.5px] font-bold border-l border-line ${
              method === m ? "bg-ink text-white" : "text-ink-mid"
            }`}
          >
            {PAYMENT_METHOD_LABEL[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
