import { notFound } from "next/navigation";
import { getStudentForEdit, listActiveTeachers } from "@/lib/queries";
import { StudentForm } from "@/components/StudentForm";

export default async function DirectorEditStudentPage({
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
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-[22px] font-bold">生徒情報編集</h1>
      <StudentForm
        mode="edit"
        studentId={studentId}
        initial={student}
        teachers={teachers}
        returnTo="/director/students"
      />
    </div>
  );
}
