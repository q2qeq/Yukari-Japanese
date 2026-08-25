// 시간표 관련 순수 유틸. 서버/클라이언트 양쪽에서 그대로 쓸 수 있도록
// "server-only" 의존성이 없는 파일로 분리합니다.

export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

// class_schedule_slots.day_of_week 체크 제약과 동일하게 0=일 ... 6=토.
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월요일부터 보여주기 위한 순서

export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? "?";
}

// "HH:MM" 또는 "HH:MM:SS" 문자열 두 구간이 겹치는지 확인.
export function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function hm(t: string): string {
  return t.slice(0, 5);
}

export type ScheduleSlotForConflictCheck = {
  class_id: string;
  class_name: string;
  classroom_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

/**
 * 강의실 하나 + 요일/시간 하나가 기존 시간표와 겹치는지 확인해, 겹치면
 * 겹치는 반 이름을 반환한다(경고 문구용). 겹치지 않으면 null.
 * 저장을 막지는 않고 경고만 보여주는 용도.
 */
export function findConflict(
  slots: ScheduleSlotForConflictCheck[],
  classroomId: string | null,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeClassId?: string,
): string | null {
  if (!classroomId || !startTime || !endTime) return null;
  const hit = slots.find(
    (s) =>
      s.classroom_id === classroomId &&
      s.day_of_week === dayOfWeek &&
      s.class_id !== excludeClassId &&
      timeRangesOverlap(startTime, endTime, s.start_time, s.end_time),
  );
  return hit ? hit.class_name : null;
}
