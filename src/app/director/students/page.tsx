import Link from "next/link";
import { listAllStudents } from "@/lib/queries";
import { StudentSearchTable } from "@/components/StudentSearchTable";

export default async function DirectorStudentListPage() {
  const students = await listAllStudents();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold">生徒管理</h1>
          <p className="text-[13px] text-ink-mid mt-1">全生徒{students.length}名</p>
        </div>
        <Link
          href="/director/students/new"
          className="rounded-lg bg-accent text-white text-[13.5px] font-semibold px-4 py-2.5"
        >
          + 生徒を追加
        </Link>
      </div>

      <StudentSearchTable students={students} />
    </div>
  );
}
