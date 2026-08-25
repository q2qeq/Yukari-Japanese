import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getTodaySessionsForTeacher } from "@/lib/queries";

function hm(t: string) {
  return t.slice(0, 5);
}

function statusBadge(enrolled: number, checked: number) {
  if (checked === 0) {
    return { label: "출석체크 필요", className: "bg-accent-soft text-accent" };
  }
  if (checked < enrolled) {
    return { label: "진행중", className: "bg-accent-soft text-accent" };
  }
  return { label: "완료", className: "bg-good-soft text-good" };
}

export default async function TeacherHomePage() {
  const session = await getSession();
  const sessions = await getTodaySessionsForTeacher(session!.staffId);

  const today = new Date().toLocaleDateString("ko-KR", {
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

      <div className="px-5 pt-3 pb-2 text-xs font-semibold text-ink-mid uppercase tracking-wide">
        오늘의 수업
      </div>

      <div className="flex-1 flex flex-col gap-3 px-5 pb-6">
        {sessions.length === 0 && (
          <p className="text-center text-[13px] text-ink-mid py-10">
            오늘 예정된 수업이 없어요
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
                  학생 {s.enrolled_count}명 · {s.checked_count}명 체크됨
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
