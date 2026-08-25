import { getAllClassesWithSchedule } from "@/lib/director-queries";
import { WeeklyScheduleGrid } from "@/components/WeeklyScheduleGrid";

export default async function DirectorSchedulePage() {
  const rows = await getAllClassesWithSchedule();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold">전체 시간표</h1>
        <p className="text-[13px] text-ink-mid mt-1">모든 선생님의 반을 합쳐서 보여줘요.</p>
      </div>

      <WeeklyScheduleGrid
        rows={rows.map((r) => ({
          class_id: r.class_id,
          class_name: r.class_name,
          level: r.level,
          day_of_week: r.day_of_week,
          start_time: r.start_time,
          end_time: r.end_time,
          teacher_name: r.teacher_name,
          classroom_name: r.classroom_name,
          enrolled_count: r.enrolled_count,
        }))}
        showTeacher
        showClassroom
        emptyMessage="개설된 반이 없어요."
      />
    </div>
  );
}
