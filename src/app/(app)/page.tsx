import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getTodaySessionsForTeacher,
  getRescheduleRequestsForTeacher,
  getMyBalanceAlerts,
} from "@/lib/queries";

function hm(t: string) {
  return t.slice(0, 5);
}

function statusBadge(enrolled: number, checked: number) {
  if (checked === 0) {
    return { label: "出席チェック未実施", className: "bg-accent-soft text-accent" };
  }
  if (checked < enrolled) {
    return { label: "進行中", className: "bg-accent-soft text-accent" };
  }
  return { label: "完了", className: "bg-good-soft text-good" };
}

export default async function TeacherHomePage() {
  const session = await getSession();
  if (session!.role === "owner") redirect("/director");
  const [sessions, rescheduleRequests, balanceAlerts] = await Promise.all([
    getTodaySessionsForTeacher(session!.staffId),
    getRescheduleRequestsForTeacher(session!.staffId),
    getMyBalanceAlerts(session!.staffId),
  ]);
  const pendingRescheduleCount = rescheduleRequests.filter((r) => r.status === "pending").length;

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 pb-1">
        <p className="text-xs text-ink-mid">{today}</p>
      </div>

      {(pendingRescheduleCount > 0 || balanceAlerts.length > 0) && (
        <div className="px-5 pt-3 flex flex-col gap-2">
          {balanceAlerts.length > 0 && (
            <Link
              href="/alerts"
              className="flex items-center justify-between rounded-xl bg-critical-soft px-4 py-3 hover:opacity-90 transition-opacity"
            >
              <span className="text-[13px] font-semibold text-critical">
                残り回数が少ない・未払いの生徒がいます
              </span>
              <span className="rounded-full bg-critical text-white text-[11px] font-bold px-2 py-0.5">
                {balanceAlerts.length}
              </span>
            </Link>
          )}
          {pendingRescheduleCount > 0 && (
            <Link
              href="/reschedule"
              className="flex items-center justify-between rounded-xl bg-warn-soft px-4 py-3 hover:opacity-90 transition-opacity"
            >
              <span className="text-[13px] font-semibold text-warn">
                割当待ちの延期リクエストがあります
              </span>
              <span className="rounded-full bg-warn text-white text-[11px] font-bold px-2 py-0.5">
                {pendingRescheduleCount}
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide">
          今日の授業
        </span>
        <Link href="/reschedule" className="text-[11.5px] font-semibold text-accent">
          延期リクエスト管理
        </Link>
      </div>

      <div className="flex-1 flex flex-col gap-3 px-5 pb-6">
        {sessions.length === 0 && (
          <p className="text-center text-[13px] text-ink-mid py-10">
            今日予定されている授業はありません
          </p>
        )}

        {sessions.map((s) => {
          const badge = statusBadge(s.enrolled_count, s.checked_count);
          return (
            <Link
              key={s.session_id}
              href={`/sessions/${s.session_id}`}
              className="border border-line-light rounded-xl p-4 flex items-start justify-between gap-3 hover:border-accent transition-colors"
            >
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[13px] text-ink-mid">
                  {hm(s.start_time)} – {hm(s.end_time)}
                </span>
                <span className="text-[16px] font-bold">{s.class_name}</span>
                <span className="text-[12.5px] text-ink-mid">
                  生徒{s.enrolled_count}名 ・{s.checked_count}名チェック済み
                </span>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
              >
                {badge.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
