import { DAY_ORDER, dayLabel, hm } from "@/lib/schedule-utils";

export type ScheduleGridRow = {
  class_id: string;
  class_name: string;
  level?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_name?: string;
  classroom_name?: string | null;
  enrolled_count?: number;
};

/**
 * 요일별 컬럼으로 반을 나열하는 주간 시간표 그리드. 선생님 개인 시간표,
 * 원장의 전체 시간표, 강의실별 시간표에서 공통으로 쓴다.
 */
export function WeeklyScheduleGrid({
  rows,
  showTeacher = false,
  showClassroom = false,
  emptyMessage = "등록된 시간표가 없어요.",
}: {
  rows: ScheduleGridRow[];
  showTeacher?: boolean;
  showClassroom?: boolean;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-line-light py-14 text-center text-[13px] text-ink-mid">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-3 min-w-[860px]">
        {DAY_ORDER.map((day) => {
          const dayRows = rows
            .filter((r) => r.day_of_week === day)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <div key={day} className="flex flex-col gap-2 min-w-0">
              <div className="text-center text-[12.5px] font-bold text-ink-mid pb-1 border-b border-line-light">
                {dayLabel(day)}요일
              </div>
              <div className="flex flex-col gap-2">
                {dayRows.length === 0 && (
                  <p className="text-center text-[11px] text-ink-mid/60 py-3">-</p>
                )}
                {dayRows.map((r, i) => (
                  <div
                    key={`${r.class_id}-${day}-${i}`}
                    className="rounded-xl border border-line-light bg-white p-2.5 flex flex-col gap-1"
                  >
                    <span className="font-mono text-[11px] text-ink-mid">
                      {hm(r.start_time)}–{hm(r.end_time)}
                    </span>
                    <span className="text-[12.5px] font-bold leading-tight">{r.class_name}</span>
                    {r.level && <span className="text-[10.5px] text-ink-mid">{r.level}</span>}
                    {showTeacher && r.teacher_name && (
                      <span className="text-[10.5px] text-accent font-semibold">
                        {r.teacher_name} 선생님
                      </span>
                    )}
                    {showClassroom && (
                      <span className="text-[10.5px] text-ink-mid">
                        {r.classroom_name ?? "강의실 미지정"}
                      </span>
                    )}
                    {typeof r.enrolled_count === "number" && (
                      <span className="text-[10.5px] text-ink-mid">학생 {r.enrolled_count}명</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
