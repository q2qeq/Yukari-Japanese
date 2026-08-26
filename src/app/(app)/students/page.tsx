import Link from "next/link";
import { listAllStudents } from "@/lib/queries";
import { StudentSearchList } from "@/components/StudentSearchList";

export default async function StudentListPage() {
  const students = await listAllStudents();

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[16.5px] font-bold">生徒管理</h1>
        <Link
          href="/students/new"
          className="rounded-lg bg-accent text-white text-[12.5px] font-semibold px-3.5 py-2"
        >
          + 生徒を追加
        </Link>
      </div>

      <StudentSearchList students={students} />
    </div>
  );
}
