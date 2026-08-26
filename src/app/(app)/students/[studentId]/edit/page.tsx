import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentForEdit, listActiveTeachers } from "@/lib/queries";
import { StudentForm } from "@/components/StudentForm";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const [student, teachers] = await Promise.all([
    getStudentForEdit(studentId),
    listActiveTeachers(),
  ]);
  if (!student) notFound();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
        <Link href={`/students/${studentId}`} aria-label="戻る">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold">生徒情報編集</span>
      </div>
      <div className="flex-1 overflow-auto px-5 pb-8">
        <StudentForm
          mode="edit"
          studentId={studentId}
          initial={student}
          teachers={teachers}
          returnTo="/students"
        />
      </div>
    </div>
  );
}
