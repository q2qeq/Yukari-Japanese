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
  const sessionRows = await sql<(SessionInfo & { is_makeup: boolean })[]>`
    select cs.id as session_id, c.name as class_name,
           cs.session_date, cs.start_time, cs.end_time, cs.is_makeup
    from class_sessions cs
    join classes c on c.id = cs.class_id
    where cs.id = ${sessionId}
  `;
  const session = sessionRows[0] ?? null;

  // 보강 세션(is_makeup=true)은 반 전체가 아니라, 이 보강을 배정받은 특정
  // 학생(들)만 출석 대상이다 (reschedule_requests.makeup_session_id로 연결).
  // 그런 학생이 없으면(예외적으로 반 전체 휴강의 대체 세션) 일반 반 전체
  // 명단으로 폴백한다.
  const roster = session?.is_makeup
    ? await sql<RosterRow[]>`
        select
          s.id as student_id,
          s.name,
          p.id as pass_id,
          p.remaining_sessions,
          a.id as attendance_id,
          a.status as attendance_status
        from reschedule_requests rr
        join students s on s.id = rr.student_id
        left join payment_passes p on p.student_id = s.id and p.status = 'active'
        left join attendance a on a.class_session_id = ${sessionId} and a.student_id = s.id
        where rr.makeup_session_id = ${sessionId} and rr.student_id is not null
        order by s.name
      `
    : [];

  if (session?.is_makeup && roster.length > 0) {
    return { session, roster };
  }

  const fullRoster = await sql<RosterRow[]>`
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

  return { session, roster: fullRoster };
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

export type UpcomingSessionOption = {
  session_id: string;
  class_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
};

/**
 * 이 학생이 활성 등록 중인 반의, 아직 지나지 않은 정규(보강 아님) 예정 세션 중
 * 이미 연기 요청(pending/scheduled)이 걸려 있지 않은 것만 반환한다.
 * 연기 요청 화면에서 "어떤 수업을 연기할지" 선택지로 사용한다.
 */
export async function getUpcomingSessionsForStudent(studentId: string) {
  return sql<UpcomingSessionOption[]>`
    select cs.id as session_id, c.name as class_name,
           cs.session_date, cs.start_time, cs.end_time
    from class_sessions cs
    join classes c on c.id = cs.class_id
    join class_enrollments ce on ce.class_id = cs.class_id
      and ce.student_id = ${studentId} and ce.status = 'active'
    where cs.session_date >= current_date
      and cs.status = 'scheduled'
      and cs.is_makeup = false
      and not exists (
        select 1 from reschedule_requests rr
        where rr.class_session_id = cs.id
          and rr.student_id = ${studentId}
          and rr.status in ('pending', 'scheduled')
      )
    order by cs.session_date, cs.start_time
  `;
}

export type RescheduleRequestRow = {
  id: string;
  reason: string | null;
  status: "pending" | "scheduled" | "completed" | "canceled";
  class_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  makeup_date: string | null;
  makeup_start: string | null;
  makeup_end: string | null;
  created_at: string;
};

export async function getRescheduleRequestsForStudent(studentId: string, limit = 5) {
  return sql<RescheduleRequestRow[]>`
    select
      rr.id, rr.reason, rr.status, rr.created_at,
      c.name as class_name,
      cs.session_date, cs.start_time, cs.end_time,
      mcs.session_date as makeup_date, mcs.start_time as makeup_start, mcs.end_time as makeup_end
    from reschedule_requests rr
    join class_sessions cs on cs.id = rr.class_session_id
    join classes c on c.id = cs.class_id
    left join class_sessions mcs on mcs.id = rr.makeup_session_id
    where rr.student_id = ${studentId}
    order by rr.created_at desc
    limit ${limit}
  `;
}

export type TeacherRescheduleRequest = {
  id: string;
  reason: string | null;
  status: "pending" | "scheduled" | "completed" | "canceled";
  class_session_id: string;
  class_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  student_id: string | null;
  student_name: string | null;
  makeup_date: string | null;
  makeup_start: string | null;
  makeup_end: string | null;
};

export async function getRescheduleRequestsForTeacher(staffId: string) {
  return sql<TeacherRescheduleRequest[]>`
    select
      rr.id, rr.reason, rr.status,
      cs.id as class_session_id, c.name as class_name,
      cs.session_date, cs.start_time, cs.end_time,
      s.id as student_id, s.name as student_name,
      mcs.session_date as makeup_date, mcs.start_time as makeup_start, mcs.end_time as makeup_end
    from reschedule_requests rr
    join class_sessions cs on cs.id = rr.class_session_id
    join classes c on c.id = cs.class_id
    left join students s on s.id = rr.student_id
    left join class_sessions mcs on mcs.id = rr.makeup_session_id
    where cs.teacher_id = ${staffId}
      and rr.status in ('pending', 'scheduled')
    order by (rr.status = 'pending') desc, cs.session_date
  `;
}

export type BalanceAlertRow = {
  student_id: string;
  student_name: string;
  phone: string | null;
  remaining_sessions: number;
  kind: "low_balance" | "overdue";
  notified: boolean;
};

/**
 * 이 선생님이 담당(primary_teacher_id)하는 학생 중 잔여 임박(1~2회) 또는
 * 외상(0 이하)인 학생 목록. 선생님 홈의 알림 배지/화면에서 사용한다.
 */
export async function getMyBalanceAlerts(staffId: string) {
  return sql<BalanceAlertRow[]>`
    select s.id as student_id, s.name as student_name, s.phone,
           p.remaining_sessions,
           case when p.remaining_sessions <= 0 then 'overdue' else 'low_balance' end as kind,
           case when p.remaining_sessions <= 0 then p.notified_overdue else p.notified_low_balance end as notified
    from payment_passes p
    join students s on s.id = p.student_id
    where p.status = 'active'
      and s.primary_teacher_id = ${staffId}
      and p.remaining_sessions <= 2
    order by p.remaining_sessions, s.name
  `;
}

export type NotificationLogRow = {
  id: string;
  trigger_type: string;
  channel: string;
  status: "pending" | "sent" | "failed";
  content: string;
  sent_at: string | null;
  created_at: string;
};

export async function getRecentNotifications(studentId: string, limit = 3) {
  return sql<NotificationLogRow[]>`
    select id, trigger_type, channel, status, content, sent_at, created_at
    from notification_logs
    where student_id = ${studentId}
    order by created_at desc
    limit ${limit}
  `;
}

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
