import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getMyBalanceAlerts } from "@/lib/queries";
import { NotifyButton } from "@/components/NotifyButton";

export default async function AlertsPage() {
  const session = await getSession();
  const alerts = await getMyBalanceAlerts(session!.staffId);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3.5">
        <Link href="/" aria-label="뒤로">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold">잔여·미수 알림</span>
      </div>

      <div className="flex-1 overflow-auto px-5 pb-6">
        {alerts.length === 0 ? (
          <p className="text-center text-[13px] text-ink-mid py-16">
            잔여 임박·외상 학생이 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((a) => (
              <div key={a.student_id} className="border border-line-light rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Link href={`/students/${a.student_id}`} className="flex flex-col gap-0.5">
                    <span className="text-[14.5px] font-bold">{a.student_name}</span>
                    <span className="font-mono text-[12px] text-ink-mid">{a.phone ?? "-"}</span>
                  </Link>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0 ${
                      a.kind === "overdue" ? "bg-critical-soft text-critical" : "bg-warn-soft text-warn"
                    }`}
                  >
                    {a.kind === "overdue" ? `외상 ${-a.remaining_sessions}회` : `잔여 ${a.remaining_sessions}회`}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <NotifyButton studentId={a.student_id} kind={a.kind === "overdue" ? "payment_overdue" : "low_balance"} />
                  <Link
                    href={`/students/${a.student_id}/charge`}
                    className="flex-1 h-11 rounded-lg bg-critical text-white text-[13px] font-bold flex items-center justify-center"
                  >
                    회차 충전
                  </Link>
                </div>
                {a.notified && (
                  <p className="text-[11px] text-ink-mid">이미 알림을 보낸 적이 있어요.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
