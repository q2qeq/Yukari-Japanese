import { listClassroomsFull, getAllClassesWithSchedule } from "@/lib/director-queries";
import { ClassroomForm } from "@/components/ClassroomForm";
import { WeeklyScheduleGrid } from "@/components/WeeklyScheduleGrid";

export default async function ClassroomsPage() {
  const [classrooms, classes] = await Promise.all([
    listClassroomsFull(),
    getAllClassesWithSchedule(),
  ]);

  const unassigned = classes.filter((c) => !c.classroom_id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold">강의실</h1>
        <p className="text-[13px] text-ink-mid mt-1">강의실별로 언제 어떤 반이 쓰는지 확인해요.</p>
      </div>

      <ClassroomForm />

      {classrooms.length === 0 && (
        <div className="bg-white rounded-2xl border border-line-light py-14 text-center text-[13px] text-ink-mid">
          등록된 강의실이 없어요. 위에서 추가해보세요.
        </div>
      )}

      {classrooms.map((room) => {
        const roomRows = classes.filter((c) => c.classroom_id === room.id);
        return (
          <div key={room.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-bold">{room.name}</h2>
              {room.capacity && (
                <span className="rounded-full bg-surface text-ink-mid text-[11px] font-semibold px-2 py-0.5">
                  정원 {room.capacity}명
                </span>
              )}
              {room.memo && <span className="text-[12px] text-ink-mid">{room.memo}</span>}
            </div>
            <WeeklyScheduleGrid
              rows={roomRows.map((r) => ({
                class_id: r.class_id,
                class_name: r.class_name,
                level: r.level,
                day_of_week: r.day_of_week,
                start_time: r.start_time,
                end_time: r.end_time,
                teacher_name: r.teacher_name,
                enrolled_count: r.enrolled_count,
              }))}
              showTeacher
              emptyMessage="이 강의실을 쓰는 반이 없어요."
            />
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-bold text-ink-mid">강의실 미지정 반</h2>
          <WeeklyScheduleGrid
            rows={unassigned.map((r) => ({
              class_id: r.class_id,
              class_name: r.class_name,
              level: r.level,
              day_of_week: r.day_of_week,
              start_time: r.start_time,
              end_time: r.end_time,
              teacher_name: r.teacher_name,
              enrolled_count: r.enrolled_count,
            }))}
            showTeacher
          />
        </div>
      )}
    </div>
  );
}
