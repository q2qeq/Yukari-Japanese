import Link from "next/link";
import { listAllStudents } from "@/lib/queries";

const STATUS_LABEL: Record<string, string> = {
  active: "재원",
  paused: "휴원",
  withdrawn: "퇴원",
};

const STATUS_CLASS: Record<string, string> = {
  active: "bg-good-soft text-good",
  paused: "bg-warn-soft text-warn",
  withdrawn: "bg-surface text-ink-mid",
};

export default async function StudentListPage() {
  const students = await listAllStudents();

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[16.5px] font-bold">학생 관리</h1>
        <Link
          href="/students/new"
          className="rounded-lg bg-accent text-white text-[12.5px] font-semibold px-3.5 py-2"
        >
          + 학생 추가
        </Link>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6 gap-2.5">
        {students.length === 0 && (
          <p className="text-center text-[13px] text-ink-mid py-10">등록된 학생이 없어요.</p>
        )}
        {students.map((s) => (
          <div
            key={s.student_id}
            className="border border-line-light rounded-xl p-4 flex items-center justify-between gap-3"
          >
            <Link href={`/students/${s.student_id}`} className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-bold">{s.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_CLASS[s.status]}`}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <span className="text-[12px] text-ink-mid">
                {s.level ?? "레벨 미지정"} · {s.primary_teacher_name ?? "담당 미지정"}
              </span>
            </Link>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-mono text-[13px] font-bold">
                {s.remaining_sessions === null ? "–" : `${s.remaining_sessions}회`}
              </span>
              <Link href={`/students/${s.student_id}/edit`} className="text-[11px] text-accent font-semibold">
                수정
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
