import Link from "next/link";
import { listStaff } from "@/lib/director-queries";

export default async function StaffListPage() {
  const staff = await listStaff();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold">先生管理</h1>
          <p className="text-[13px] text-ink-mid mt-1">教室長/先生アカウント{staff.length}名</p>
        </div>
        <Link
          href="/director/staff/new"
          className="rounded-lg bg-accent text-white text-[13.5px] font-semibold px-4 py-2.5"
        >
          + 先生を追加
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-line-light overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line-light text-left text-ink-mid text-[12px]">
              <th className="px-5 py-3 font-semibold">名前</th>
              <th className="px-5 py-3 font-semibold">役割</th>
              <th className="px-5 py-3 font-semibold">電話番号</th>
              <th className="px-5 py-3 font-semibold">担当クラス/生徒</th>
              <th className="px-5 py-3 font-semibold">ステータス</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-line-light last:border-none">
                <td className="px-5 py-3.5 font-semibold">
                  <Link href={`/director/staff/${s.id}`} className="hover:text-accent">
                    {s.name}
                  </Link>
                </td>
                <td className="px-5 py-3.5">{s.role === "owner" ? "教室長" : "先生"}</td>
                <td className="px-5 py-3.5 font-mono text-ink-mid">{s.phone}</td>
                <td className="px-5 py-3.5 text-ink-mid">
                  クラス{s.class_count}件 ・生徒{s.student_count}名
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
                      s.is_active ? "bg-good-soft text-good" : "bg-surface text-ink-mid"
                    }`}
                  >
                    {s.is_active ? "有効" : "無効"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  <Link href={`/director/staff/${s.id}`} className="text-accent font-semibold mr-3">
                    詳細
                  </Link>
                  <Link href={`/director/staff/${s.id}/edit`} className="text-ink-mid font-semibold">
                    編集
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
