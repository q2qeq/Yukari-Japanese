import Link from "next/link";
import { getRecentPayments } from "@/lib/director-queries";

const METHOD_LABEL: Record<string, string> = {
  cash: "현금",
  bank_transfer: "계좌이체",
  card: "카드",
  other: "기타",
};

function fmtWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function PaymentsPage() {
  const payments = await getRecentPayments();
  const todayTotal = payments
    .filter((p) => fmtDate(p.purchased_at) === fmtDate(new Date()))
    .reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold">결제 내역</h1>
        <p className="text-[13px] text-ink-mid mt-1">
          선생님이 학생 상세 화면에서 등록한 회차 충전 내역이에요. 오늘 결제 합계{" "}
          <span className="font-bold text-ink">{fmtWon(todayTotal)}</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-line-light overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line-light text-left text-ink-mid text-[12px]">
              <th className="px-5 py-3 font-semibold">결제일</th>
              <th className="px-5 py-3 font-semibold">학생</th>
              <th className="px-5 py-3 font-semibold">상품</th>
              <th className="px-5 py-3 font-semibold">결제수단</th>
              <th className="px-5 py-3 font-semibold">금액</th>
              <th className="px-5 py-3 font-semibold">충전 후 잔여</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-ink-mid">
                  결제 내역이 없어요.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-line-light last:border-none">
                <td className="px-5 py-3.5 font-mono text-ink-mid">{fmtDate(p.purchased_at)}</td>
                <td className="px-5 py-3.5 font-semibold">{p.student_name}</td>
                <td className="px-5 py-3.5">{p.pass_name}</td>
                <td className="px-5 py-3.5">
                  <span className="rounded-full bg-surface text-ink-mid px-2.5 py-0.5 text-[11.5px] font-semibold">
                    {METHOD_LABEL[p.payment_method] ?? p.payment_method}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono font-semibold">{fmtWon(p.price)}</td>
                <td className="px-5 py-3.5 font-mono">{p.remaining_sessions}회</td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/students/${p.student_id}`} className="text-accent font-semibold">
                    학생 상세 →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
