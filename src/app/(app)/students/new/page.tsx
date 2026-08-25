import Link from "next/link";
import { listActiveTeachers } from "@/lib/queries";
import { StudentForm } from "@/components/StudentForm";

export default async function NewStudentPage() {
  const teachers = await listActiveTeachers();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
        <Link href="/students" aria-label="뒤로">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold">학생 추가</span>
      </div>
      <div className="flex-1 overflow-auto px-5 pb-8">
        <StudentForm mode="create" teachers={teachers} returnTo="/students" />
      </div>
    </div>
  );
}
