import Link from "next/link";
import { listClassrooms, getAllScheduleSlotsForConflictCheck } from "@/lib/queries";
import { ClassScheduleForm } from "@/components/ClassScheduleForm";

export default async function NewClassPage() {
  const [classrooms, existingSlots] = await Promise.all([
    listClassrooms(),
    getAllScheduleSlotsForConflictCheck(),
  ]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
        <Link href="/schedule" aria-label="뒤로">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold">반 개설</span>
      </div>
      <div className="flex-1 overflow-auto px-5 pb-8">
        <ClassScheduleForm classrooms={classrooms} existingSlots={existingSlots} />
      </div>
    </div>
  );
}
