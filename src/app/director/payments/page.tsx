import Link from "next/link";
import { getRecentPayments } from "@/lib/director-queries";

const METHOD_LABEL: Record<string, string> = {
  cash: "現金",
  bank_transfer: "口座振込",
  card: "カード",
  other: "その他",
};

function fmtWon(n: number) {
  return n.toLocaleString("ja-JP") + "ウォン";
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ja-JP", {
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
        <h1 className="text-[22px] font-bold">支払い履歴</h1>
        <p className="text-[13px] text-ink-mid mt-1">
          先生が生徒詳細画面で登録した回数チャージの履歴です。本日の支払い合計{" "}
          <span className="font-bold text-ink">{fmtWon(todayTotal)}</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-line-light overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line-light text-left text-ink-mid text-[12px]">
              <th className="px-5 py-3 font-semibold">支払日</th>
              <th className="px-5 py-3 font-semibold">生徒</th>
              <th className="px-5 py-3 font-semibold">商品</th>
              <th className="px-5 py-3 font-semibold">支払い方法</th>
              <th className="px-5 py-3 font-semibold">金額</th>
              <th className="px-5 py-3 font-semibold">チャージ後の残り</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-ink-mid">
                  支払い履歴がありません。
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
                <td className="px-5 py-3.5 font-mono">{p.remaining_sessions}回</td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/students/${p.student_id}`} className="text-accent font-semibold">
                    生徒詳細 →
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
