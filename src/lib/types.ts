// 클라이언트/서버 양쪽에서 공유하는 순수 타입만 모아둡니다.
// (queries.ts 등 실제 DB 접근 파일은 "server-only"라 클라이언트 컴포넌트에서
//  타입만 가져오더라도 번들링 문제가 생길 수 있어 분리했습니다.)

export type AttendanceStatus = "present" | "absent" | "makeup_scheduled" | "excused";

export type RosterRow = {
  student_id: string;
  name: string;
  pass_id: string | null;
  remaining_sessions: number | null;
  attendance_id: string | null;
  attendance_status: AttendanceStatus | null;
};

export type SessionInfo = {
  session_id: string;
  class_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
};
