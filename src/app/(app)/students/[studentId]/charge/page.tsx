import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/queries";
import { ChargeForm } from "@/components/ChargeForm";

export default async function ChargeSessionPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = await getStudentDetail(studentId);
  if (!student) notFound();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-2">
        <Link href={`/students/${studentId}`} aria-label="뒤로">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold">회차 충전</span>
      </div>

      <ChargeForm
        studentId={studentId}
        studentName={student.name}
        currentRemaining={student.remaining_sessions}
      />
    </div>
  );
}
