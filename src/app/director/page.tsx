import Link from "next/link";
import {
  getTodayOverviewAllTeachers,
  getDashboardCounts,
  getTodayPaymentStats,
} from "@/lib/director-queries";

function hm(t: string) {
  return t.slice(0, 5);
}

function StatCard({
  href,
  label,
  value,
  unit,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  unit: string;
  tone: "critical" | "warn" | "accent";
}) {
  const toneClass = {
    critical: "text-critical",
    warn: "text-warn",
    accent: "text-accent",
  }[tone];

  return (
    <Link
      href={href}
      className="flex-1 min-w-[200px] bg-white rounded-2xl border border-line-light p-5 flex flex-col gap-2 hover:border-accent transition-colors"
    >
      <span className="text-[12.5px] font-semibold text-ink-mid">{label}</span>
      <span className={`text-[30px] font-extrabold leading-none ${toneClass}`}>
        {value}
        <span className="text-[14px] font-semibold ml-1">{unit}</span>
      </span>
    </Link>
  );
}

export default async function DirectorHomePage() {
  const [sessions, counts, paymentStats] = await Promise.all([
    getTodayOverviewAllTeachers(),
    getDashboardCounts(),
    getTodayPaymentStats(),
  ]);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-xs text-ink-mid mb-1">{today}</p>
        <h1 className="text-[22px] font-bold">원장 대시보드</h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <StatCard
          href="/director/unpaid"
          label="미수 학생"
          value={counts.unpaidCount}
          unit="명"
          tone="critical"
        />
        <StatCard
          href="/director/unpaid?filter=low_balance"
          label="잔여 임박(1~2회)"
          value={counts.lowBalanceCount}
          unit="명"
          tone="warn"
        />
        <StatCard
          href="/director/consultations"
          label="신규 상담"
          value={counts.newConsultationCount}
          unit="건"
          tone="accent"
        />
        <StatCard
          href="/director/consultations"
          label="후속 연락 필요"
          value={counts.dueFollowUpCount}
          unit="건"
          tone="warn"
        />
        <StatCard
          href="/director/payments"
          label="오늘 결제 건수"
          value={paymentStats.count}
          unit="건"
          tone="accent"
        />
      </div>

      <div className="bg-white rounded-2xl border border-line-light">
        <div className="px-5 py-4 border-b border-line-light">
          <h2 className="text-[15px] font-bold">오늘의 전체 수업</h2>
        </div>
        {sessions.length === 0 ? (
          <p className="text-center text-[13px] text-ink-mid py-10">
            오늘 예정된 수업이 없어요
          </p>
        ) : (
          <div className="divide-y divide-line-light">
            {sessions.map((s) => {
              const done = s.checked_count >= s.enrolled_count && s.enrolled_count > 0;
              const started = s.checked_count > 0;
              return (
                <div
                  key={s.session_id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[13px] text-ink-mid w-[100px]">
                      {hm(s.start_time)}–{hm(s.end_time)}
                    </span>
                    <span className="text-[14.5px] font-bold">{s.class_name}</span>
                    <span className="text-[12.5px] text-ink-mid">{s.teacher_name} 선생님</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12.5px] text-ink-mid">
                      {s.checked_count}/{s.enrolled_count}명 체크
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        done
                          ? "bg-good-soft text-good"
                          : started
                          ? "bg-accent-soft text-accent"
                          : "bg-surface text-ink-mid"
                      }`}
                    >
                      {done ? "완료" : started ? "진행중" : "체크 전"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
