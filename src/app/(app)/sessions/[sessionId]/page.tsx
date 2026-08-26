import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionRoster } from "@/lib/queries";
import { AttendanceRoster } from "@/components/AttendanceRoster";

function hm(t: string) {
  return t.slice(0, 5);
}

export default async function AttendanceCheckPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { session, roster } = await getSessionRoster(sessionId);

  if (!session) notFound();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3.5">
        <Link href="/" aria-label="戻る">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex flex-col gap-0.5">
          <span className="text-[16.5px] font-bold">{session.class_name}</span>
          <span className="font-mono text-[11.5px] text-ink-mid">
            {new Date(session.session_date).toLocaleDateString("ja-JP", {
              month: "long",
              day: "numeric",
              weekday: "short",
            })}{" "}
            {hm(session.start_time)}–{hm(session.end_time)}
          </span>
        </div>
      </div>

      <AttendanceRoster sessionId={sessionId} initialRoster={roster} />
    </div>
  );
}
