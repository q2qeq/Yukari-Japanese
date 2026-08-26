import { listActiveTeachers } from "@/lib/queries";
import { StudentForm } from "@/components/StudentForm";

export default async function DirectorNewStudentPage() {
  const teachers = await listActiveTeachers();

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-[22px] font-bold">生徒を追加</h1>
      <StudentForm mode="create" teachers={teachers} returnTo="/director/students" />
    </div>
  );
}
