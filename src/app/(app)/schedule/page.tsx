import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getClassesForTeacherSchedule } from "@/lib/queries";
import { WeeklyScheduleGrid } from "@/components/WeeklyScheduleGrid";

export default async function TeacherSchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await getClassesForTeacherSchedule(session.staffId);

  return (
    <div className="flex-1 flex flex-col px-5 pt-5 pb-8 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[16.5px] font-bold">내 시간표</h1>
        <Link
          href="/schedule/new"
          className="rounded-lg bg-accent text-white text-[12.5px] font-semibold px-3.5 py-2"
        >
          + 반 개설
        </Link>
      </div>

      <WeeklyScheduleGrid
        rows={rows.map((r) => ({
          class_id: r.class_id,
          class_name: r.class_name,
          level: r.level,
          day_of_week: r.day_of_week,
          start_time: r.start_time,
          end_time: r.end_time,
          classroom_name: r.classroom_name,
          enrolled_count: r.enrolled_count,
        }))}
        showClassroom
        emptyMessage="아직 개설한 반이 없어요. '반 개설'로 시작해보세요."
      />
    </div>
  );
}
