import Link from "next/link";
import { listStaff } from "@/lib/director-queries";

export default async function StaffListPage() {
  const staff = await listStaff();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold">선생님 관리</h1>
          <p className="text-[13px] text-ink-mid mt-1">원장/선생님 계정 {staff.length}명</p>
        </div>
        <Link
          href="/director/staff/new"
          className="rounded-lg bg-accent text-white text-[13.5px] font-semibold px-4 py-2.5"
        >
          + 선생님 추가
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-line-light overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line-light text-left text-ink-mid text-[12px]">
              <th className="px-5 py-3 font-semibold">이름</th>
              <th className="px-5 py-3 font-semibold">역할</th>
              <th className="px-5 py-3 font-semibold">전화번호</th>
              <th className="px-5 py-3 font-semibold">담당 반/학생</th>
              <th className="px-5 py-3 font-semibold">상태</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-line-light last:border-none">
                <td className="px-5 py-3.5 font-semibold">{s.name}</td>
                <td className="px-5 py-3.5">{s.role === "owner" ? "원장" : "선생님"}</td>
                <td className="px-5 py-3.5 font-mono text-ink-mid">{s.phone}</td>
                <td className="px-5 py-3.5 text-ink-mid">
                  반 {s.class_count}개 · 학생 {s.student_count}명
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
                      s.is_active ? "bg-good-soft text-good" : "bg-surface text-ink-mid"
                    }`}
                  >
                    {s.is_active ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/director/staff/${s.id}/edit`} className="text-accent font-semibold">
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
