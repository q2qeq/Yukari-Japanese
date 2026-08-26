import { listClassroomsFull, getAllClassesWithSchedule } from "@/lib/director-queries";
import { WeeklyScheduleGrid } from "@/components/WeeklyScheduleGrid";

// 선생님도 강의실별로 언제 어떤 반이 쓰는지 볼 수 있도록 만든 읽기 전용 화면.
// 강의실 추가/수정은 원장 전용(director/classrooms)에서만 가능하다.
export default async function TeacherClassroomsPage() {
  const [classrooms, classes] = await Promise.all([
    listClassroomsFull(),
    getAllClassesWithSchedule(),
  ]);

  const unassigned = classes.filter((c) => !c.classroom_id);

  return (
    <div className="flex-1 flex flex-col px-5 pt-5 pb-8 gap-5">
      <h1 className="text-[16.5px] font-bold">教室状況</h1>

      {classrooms.length === 0 && (
        <div className="bg-white rounded-2xl border border-line-light py-14 text-center text-[13px] text-ink-mid">
          登録された教室がありません。
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
                  定員{room.capacity}名
                </span>
              )}
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
              emptyMessage="この教室を使うクラスがありません。"
            />
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-bold text-ink-mid">教室未指定のクラス</h2>
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
