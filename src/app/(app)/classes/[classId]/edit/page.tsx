import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getClassDetail,
  getClassScheduleSlots,
  listClassrooms,
  getAllScheduleSlotsForConflictCheck,
} from "@/lib/queries";
import { hm } from "@/lib/schedule-utils";
import { ClassScheduleForm } from "@/components/ClassScheduleForm";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const cls = await getClassDetail(classId);
  if (!cls) notFound();

  const canEdit = session.role === "owner" || session.staffId === cls.teacher_id;
  if (!canEdit) redirect(`/classes/${classId}`);

  const [slots, classrooms, existingSlots] = await Promise.all([
    getClassScheduleSlots(classId),
    listClassrooms(),
    getAllScheduleSlotsForConflictCheck(),
  ]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
        <Link href={`/classes/${classId}`} aria-label="戻る">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold">クラス情報編集</span>
      </div>
      <div className="flex-1 overflow-auto px-5 pb-8">
        <ClassScheduleForm
          mode="edit"
          classId={classId}
          classrooms={classrooms}
          existingSlots={existingSlots}
          canManageClassrooms={session.role === "owner"}
          initial={{
            name: cls.class_name,
            level: cls.level,
            capacity: cls.capacity,
            classroomId: cls.classroom_id,
            status: cls.status,
          }}
          initialSlots={slots.map((s) => ({
            dayOfWeek: s.day_of_week,
            startTime: hm(s.start_time),
            endTime: hm(s.end_time),
          }))}
        />
      </div>
    </div>
  );
}
