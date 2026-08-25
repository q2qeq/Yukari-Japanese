import "server-only";
import { sql } from "@/lib/db";
import type { RosterRow, SessionInfo } from "@/lib/types";

export type { RosterRow, SessionInfo };

export type TodaySession = {
  session_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  class_id: string;
  class_name: string;
  enrolled_count: number;
  checked_count: number;
};

export async function getTodaySessionsForTeacher(staffId: string) {
  return sql<TodaySession[]>`
    select
      cs.id as session_id,
      cs.session_date,
      cs.start_time,
      cs.end_time,
      c.id as class_id,
      c.name as class_name,
      (select count(*)::int from class_enrollments ce
         where ce.class_id = c.id and ce.status = 'active') as enrolled_count,
      (select count(*)::int from attendance a
         where a.class_session_id = cs.id) as checked_count
    from class_sessions cs
    join classes c on c.id = cs.class_id
    where cs.teacher_id = ${staffId}
      and cs.session_date = current_date
      and cs.status != 'canceled'
    order by cs.start_time
  `;
}

export async function getSessionRoster(sessionId: string) {
  const sessionRows = await sql<SessionInfo[]>`
    select cs.id as session_id, c.name as class_name,
           cs.session_date, cs.start_time, cs.end_time
    from class_sessions cs
    join classes c on c.id = cs.class_id
    where cs.id = ${sessionId}
  `;
  const session = sessionRows[0] ?? null;

  const roster = await sql<RosterRow[]>`
    select
      s.id as student_id,
      s.name,
      p.id as pass_id,
      p.remaining_sessions,
      a.id as attendance_id,
      a.status as attendance_status
    from class_sessions cs
    join class_enrollments ce on ce.class_id = cs.class_id and ce.status = 'active'
    join students s on s.id = ce.student_id
    left join payment_passes p on p.student_id = s.id and p.status = 'active'
    left join attendance a on a.class_session_id = cs.id and a.student_id = s.id
    where cs.id = ${sessionId}
    order by s.name
  `;

  return { session, roster };
}

export type StudentDetail = {
  student_id: string;
  name: string;
  phone: string | null;
  is_minor: boolean;
  guardian_phone: string | null;
  level: string | null;
  pass_id: string | null;
  remaining_sessions: number | null;
  pass_purchased_at: string | null;
};

export async function getStudentDetail(studentId: string) {
  const rows = await sql<StudentDetail[]>`
    select
      s.id as student_id, s.name, s.phone, s.is_minor, s.guardian_phone, s.level,
      p.id as pass_id, p.remaining_sessions, p.purchased_at as pass_purchased_at
    from students s
    left join payment_passes p on p.student_id = s.id and p.status = 'active'
    where s.id = ${studentId}
  `;
  return rows[0] ?? null;
}

export type AttendanceHistoryRow = {
  session_date: string;
  class_name: string;
  status: "present" | "absent" | "makeup_scheduled" | "excused";
};

export async function getRecentAttendance(studentId: string, limit = 5) {
  return sql<AttendanceHistoryRow[]>`
    select cs.session_date, c.name as class_name, a.status
    from attendance a
    join class_sessions cs on cs.id = a.class_session_id
    join classes c on c.id = cs.class_id
    where a.student_id = ${studentId}
    order by cs.session_date desc, cs.start_time desc
    limit ${limit}
  `;
}
