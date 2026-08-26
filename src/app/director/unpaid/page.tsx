import Link from "next/link";
import { getUnpaidCandidates, getLowBalanceStudents } from "@/lib/director-queries";

const TABS = [
  { key: "all", label: "全ての未払い" },
  { key: "no_active_pass", label: "未決済" },
  { key: "overdue", label: "未払い" },
  { key: "low_balance", label: "残り回数少" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function reasonBadge(reason: "no_active_pass" | "overdue") {
  if (reason === "no_active_pass") {
    return { label: "未決済", className: "bg-surface text-ink-mid" };
  }
  return { label: "未払い", className: "bg-critical-soft text-critical" };
}

export default async function UnpaidManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const active: TabKey = (TABS.find((t) => t.key === filter)?.key ?? "all") as TabKey;

  const [unpaid, lowBalance] = await Promise.all([
    getUnpaidCandidates(),
    getLowBalanceStudents(),
  ]);

  const filteredUnpaid =
    active === "no_active_pass" || active === "overdue"
      ? unpaid.filter((u) => u.reason === active)
      : unpaid;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold">未払い・通知状況</h1>
        <p className="text-[13px] text-ink-mid mt-1">
          支払いが必要な生徒と残り回数が少ない生徒を一箇所で確認できます。
        </p>
      </div>

      <div className="flex gap-1.5 bg-white rounded-xl border border-line-light p-1.5 w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/director/unpaid" : `/director/unpaid?filter=${tab.key}`}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              active === tab.key ? "bg-ink text-white" : "text-ink-mid hover:bg-surface"
            }`}
          >
            {tab.label}
            {tab.key === "low_balance"
              ? ` (${lowBalance.length})`
              : tab.key === "all"
              ? ` (${unpaid.length})`
              : ` (${unpaid.filter((u) => u.reason === tab.key).length})`}
          </Link>
        ))}
      </div>

      {active === "low_balance" ? (
        <div className="bg-white rounded-2xl border border-line-light overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line-light text-left text-ink-mid text-[12px]">
                <th className="px-5 py-3 font-semibold">名前</th>
                <th className="px-5 py-3 font-semibold">電話番号</th>
                <th className="px-5 py-3 font-semibold">残り回数</th>
                <th className="px-5 py-3 font-semibold">通知送信</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {lowBalance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-mid">
                    残り回数が少ない生徒はいません。
                  </td>
                </tr>
              )}
              {lowBalance.map((row) => (
                <tr key={row.pass_id} className="border-b border-line-light last:border-none">
                  <td className="px-5 py-3.5 font-semibold">{row.student_name}</td>
                  <td className="px-5 py-3.5 font-mono text-ink-mid">{row.phone ?? "-"}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-warn-soft text-warn px-2.5 py-0.5 text-[11.5px] font-bold">
                      残り{row.remaining_sessions}回
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-mid">
                    {row.notified_low_balance ? "送信済み" : "未送信"}
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <Link
                      href={`/students/${row.student_id}/charge`}
                      className="text-critical font-semibold mr-3"
                    >
                      チャージ
                    </Link>
                    <Link href={`/students/${row.student_id}`} className="text-accent font-semibold">
                      生徒詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-line-light overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line-light text-left text-ink-mid text-[12px]">
                <th className="px-5 py-3 font-semibold">名前</th>
                <th className="px-5 py-3 font-semibold">電話番号</th>
                <th className="px-5 py-3 font-semibold">理由</th>
                <th className="px-5 py-3 font-semibold">未払い回数</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUnpaid.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-mid">
                    該当する生徒はいません。
                  </td>
                </tr>
              )}
              {filteredUnpaid.map((row) => {
                const badge = reasonBadge(row.reason);
                return (
                  <tr key={row.student_id} className="border-b border-line-light last:border-none">
                    <td className="px-5 py-3.5 font-semibold">{row.student_name}</td>
                    <td className="px-5 py-3.5 font-mono text-ink-mid">{row.phone ?? "-"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {row.owed_sessions !== null ? `${row.owed_sessions}回` : "-"}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <Link
                        href={`/students/${row.student_id}/charge`}
                        className="text-critical font-semibold mr-3"
                      >
                        チャージ（未払い解消）
                      </Link>
                      <Link href={`/students/${row.student_id}`} className="text-accent font-semibold">
                        生徒詳細 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
