import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail, getUpcomingSessionsForStudent } from "@/lib/queries";
import { RescheduleRequestForm } from "@/components/RescheduleRequestForm";

export default async function RescheduleRequestPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = await getStudentDetail(studentId);
  if (!student) notFound();

  const options = await getUpcomingSessionsForStudent(studentId);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-2">
        <Link href={`/students/${studentId}`} aria-label="戻る">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex flex-col gap-0.5">
          <span className="text-[16.5px] font-bold">延期リクエスト</span>
          <span className="text-[12px] text-ink-mid">{student.name}さん</span>
        </div>
      </div>

      <RescheduleRequestForm studentId={studentId} options={options} />
    </div>
  );
}
