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

export default async function DirectorStudentListPage() {
  const students = await listAllStudents();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold">학생 관리</h1>
          <p className="text-[13px] text-ink-mid mt-1">전체 학생 {students.length}명</p>
        </div>
        <Link
          href="/director/students/new"
          className="rounded-lg bg-accent text-white text-[13.5px] font-semibold px-4 py-2.5"
        >
          + 학생 추가
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-line-light overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line-light text-left text-ink-mid text-[12px]">
              <th className="px-5 py-3 font-semibold">이름</th>
              <th className="px-5 py-3 font-semibold">전화번호</th>
              <th className="px-5 py-3 font-semibold">레벨</th>
              <th className="px-5 py-3 font-semibold">담당 선생님</th>
              <th className="px-5 py-3 font-semibold">상태</th>
              <th className="px-5 py-3 font-semibold">잔여</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-ink-mid">
                  등록된 학생이 없어요.
                </td>
              </tr>
            )}
            {students.map((s) => (
              <tr key={s.student_id} className="border-b border-line-light last:border-none">
                <td className="px-5 py-3.5 font-semibold">{s.name}</td>
                <td className="px-5 py-3.5 font-mono text-ink-mid">{s.phone ?? "-"}</td>
                <td className="px-5 py-3.5">{s.level ?? "-"}</td>
                <td className="px-5 py-3.5">{s.primary_teacher_name ?? "미지정"}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${STATUS_CLASS[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono">
                  {s.remaining_sessions === null ? "-" : `${s.remaining_sessions}회`}
                </td>
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  <Link href={`/students/${s.student_id}`} className="text-accent font-semibold mr-3">
                    상세
                  </Link>
                  <Link href={`/director/students/${s.student_id}/edit`} className="text-ink-mid font-semibold">
                    수정
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
