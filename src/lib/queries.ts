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
  occupation: string | null;
  study_purpose: string | null;
  current_textbook: string | null;
  pass_id: string | null;
  remaining_sessions: number | null;
  pass_purchased_at: string | null;
};

export async function getStudentDetail(studentId: string) {
  const rows = await sql<StudentDetail[]>`
    select
      s.id as student_id, s.name, s.phone, s.is_minor, s.guardian_phone, s.level,
      s.occupation, s.study_purpose, s.current_textbook,
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

// ----------------------------------------------------------------------------
// 학생 DB 추가/수정 (선생님·원장 공용)
// ----------------------------------------------------------------------------

export type StudentListRow = {
  student_id: string;
  name: string;
  phone: string | null;
  level: string | null;
  status: "active" | "paused" | "withdrawn";
  primary_teacher_id: string | null;
  primary_teacher_name: string | null;
  remaining_sessions: number | null;
};

export async function listAllStudents() {
  return sql<StudentListRow[]>`
    select
      s.id as student_id, s.name, s.phone, s.level, s.status,
      s.primary_teacher_id, st.name as primary_teacher_name,
      p.remaining_sessions
    from students s
    left join staff st on st.id = s.primary_teacher_id
    left join payment_passes p on p.student_id = s.id and p.status = 'active'
    order by (s.status = 'active') desc, s.name
  `;
}

export type StudentEditData = {
  id: string;
  name: string;
  phone: string | null;
  is_minor: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  kakao_channel_friend: boolean;
  level: string | null;
  primary_teacher_id: string | null;
  status: "active" | "paused" | "withdrawn";
  occupation: string | null;
  study_purpose: string | null;
  current_textbook: string | null;
  memo: string | null;
};

export async function getStudentForEdit(studentId: string) {
  const rows = await sql<StudentEditData[]>`
    select id, name, phone, is_minor, guardian_name, guardian_phone,
           kakao_channel_friend, level, primary_teacher_id, status,
           occupation, study_purpose, current_textbook, memo
    from students
    where id = ${studentId}
  `;
  return rows[0] ?? null;
}

export type StudentOption = { id: string; name: string };

/** 아카이브 화면(수업일지/월별관리일지)의 학생 필터 드롭다운용 전체 학생 목록. */
export async function listAllStudentOptions() {
  return sql<StudentOption[]>`select id, name from students order by name`;
}

export type TeacherOption = { id: string; name: string; role: "owner" | "teacher" };

export async function listActiveTeachers() {
  return sql<TeacherOption[]>`
    select id, name, role from staff
    where is_active = true
    order by (role = 'teacher') desc, name
  `;
}

// ----------------------------------------------------------------------------
// 강의실 DB (조회는 선생님도, 관리는 원장만)
// ----------------------------------------------------------------------------

export type ClassroomOption = { id: string; name: string; capacity: number | null };

export async function listClassrooms() {
  return sql<ClassroomOption[]>`
    select id, name, capacity from classrooms order by name
  `;
}

// ----------------------------------------------------------------------------
// 수업 시간표 (반 개설/조회)
// ----------------------------------------------------------------------------

export type MyClassRow = {
  class_id: string;
  class_name: string;
  level: string | null;
  capacity: number;
  classroom_id: string | null;
  classroom_name: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  enrolled_count: number;
};

export async function getClassesForTeacherSchedule(staffId: string) {
  return sql<MyClassRow[]>`
    select
      c.id as class_id, c.name as class_name, c.level, c.capacity,
      c.classroom_id, cr.name as classroom_name,
      slot.day_of_week, slot.start_time, slot.end_time,
      (select count(*)::int from class_enrollments ce
         where ce.class_id = c.id and ce.status = 'active') as enrolled_count
    from classes c
    join class_schedule_slots slot on slot.class_id = c.id
    left join classrooms cr on cr.id = c.classroom_id
    where c.teacher_id = ${staffId} and c.status = 'active'
    order by slot.day_of_week, slot.start_time
  `;
}

/**
 * 반 개설 화면에서 강의실 중복 체크에 쓸 전체(모든 선생님) 활성 반의
 * 요일/시간/강의실 목록. 학원 규모가 작아 한 번에 다 불러와도 부담 없다.
 */
export async function getAllScheduleSlotsForConflictCheck() {
  return sql<
    {
      class_id: string;
      class_name: string;
      classroom_id: string | null;
      day_of_week: number;
      start_time: string;
      end_time: string;
    }[]
  >`
    select c.id as class_id, c.name as class_name, c.classroom_id,
           slot.day_of_week, slot.start_time, slot.end_time
    from class_schedule_slots slot
    join classes c on c.id = slot.class_id
    where c.status = 'active'
  `;
}

// ----------------------------------------------------------------------------
// 반 상세 / 학생 등록(class_enrollments) — 시간표에서 반을 눌렀을 때 쓰는 화면
// ----------------------------------------------------------------------------

export type ClassDetail = {
  class_id: string;
  class_name: string;
  level: string | null;
  capacity: number;
  status: "active" | "archived";
  teacher_id: string;
  teacher_name: string;
  classroom_id: string | null;
  classroom_name: string | null;
};

export async function getClassDetail(classId: string) {
  const rows = await sql<ClassDetail[]>`
    select
      c.id as class_id, c.name as class_name, c.level, c.capacity, c.status,
      c.teacher_id, st.name as teacher_name,
      c.classroom_id, cr.name as classroom_name
    from classes c
    join staff st on st.id = c.teacher_id
    left join classrooms cr on cr.id = c.classroom_id
    where c.id = ${classId}
  `;
  return rows[0] ?? null;
}

export type ClassSlotRow = { day_of_week: number; start_time: string; end_time: string };

export async function getClassScheduleSlots(classId: string) {
  return sql<ClassSlotRow[]>`
    select day_of_week, start_time, end_time
    from class_schedule_slots
    where class_id = ${classId}
    order by day_of_week, start_time
  `;
}

export type ClassRosterRow = {
  student_id: string;
  name: string;
  phone: string | null;
  status: "active" | "paused" | "withdrawn";
  remaining_sessions: number | null;
  current_textbook: string | null;
  enrolled_at: string;
};

export async function getClassRoster(classId: string) {
  return sql<ClassRosterRow[]>`
    select
      s.id as student_id, s.name, s.phone, s.status,
      p.remaining_sessions, s.current_textbook,
      ce.enrolled_at
    from class_enrollments ce
    join students s on s.id = ce.student_id
    left join payment_passes p on p.student_id = s.id and p.status = 'active'
    where ce.class_id = ${classId} and ce.status = 'active'
    order by s.name
  `;
}

export type EnrollableStudent = { id: string; name: string; level: string | null };

/** 이 반에 아직(또는 더 이상) 등록돼 있지 않은 재원 학생 목록 — 등록 드롭다운용. */
export async function getEnrollableStudents(classId: string) {
  return sql<EnrollableStudent[]>`
    select s.id, s.name, s.level
    from students s
    where s.status = 'active'
      and not exists (
        select 1 from class_enrollments ce
        where ce.class_id = ${classId} and ce.student_id = s.id and ce.status = 'active'
      )
    order by s.name
  `;
}

export type EnrolledClassRow = {
  slot_id: string;
  class_id: string;
  class_name: string;
  level: string | null;
  teacher_id: string;
  teacher_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

/** 이 학생이 실제로 등록되어 있는 반과, 각 반의 담당 선생님 — 학생 상세 화면용. */
export async function getEnrolledClassesForStudent(studentId: string) {
  return sql<EnrolledClassRow[]>`
    select
      slot.id as slot_id,
      c.id as class_id, c.name as class_name, c.level,
      c.teacher_id, st.name as teacher_name,
      slot.day_of_week, slot.start_time, slot.end_time
    from class_enrollments ce
    join classes c on c.id = ce.class_id
    join staff st on st.id = c.teacher_id
    join class_schedule_slots slot on slot.class_id = c.id
    where ce.student_id = ${studentId} and ce.status = 'active' and c.status = 'active'
    order by slot.day_of_week, slot.start_time
  `;
}

// ----------------------------------------------------------------------------
// 수업일지 (선생님 쪽): 출석체크 후 "授業を終える"에서 학생별로 작성
// ----------------------------------------------------------------------------

export type JournalDraftRow = {
  student_id: string;
  content: string | null;
  achievement: "A" | "B" | "C" | null;
};

/** 이 세션(회차)에 이미 저장된 수업일지가 있으면 학생별로 미리 채워 넣기 위한 조회. */
export async function getClassJournalsForSession(sessionId: string) {
  return sql<JournalDraftRow[]>`
    select student_id, content, achievement
    from class_journals
    where class_session_id = ${sessionId}
  `;
}

// ----------------------------------------------------------------------------
// 월별 관리일지 (선생님 쪽): 매월 초, 담당 학생별로 작성해 원장에게 전송
// ----------------------------------------------------------------------------

export type MyStudentReportRow = {
  student_id: string;
  student_name: string;
  level: string | null;
  report_content: string | null;
  report_updated_at: string | null;
};

/**
 * 이 선생님(primary_teacher_id)이 담당하는 재원 학생 목록과, 지정된 달(report_month,
 * 항상 1일로 정규화된 DATE 문자열 "YYYY-MM-01")에 이미 작성한 월별 관리일지가
 * 있으면 그 내용을 함께 반환한다(수정 화면에서 이어서 작성할 수 있도록).
 */
export async function getMyStudentsForMonthlyReport(staffId: string, reportMonth: string) {
  return sql<MyStudentReportRow[]>`
    select
      s.id as student_id, s.name as student_name, s.level,
      mr.content as report_content, mr.updated_at as report_updated_at
    from students s
    left join monthly_reports mr
      on mr.student_id = s.id and mr.report_month = ${reportMonth}::date
    where s.primary_teacher_id = ${staffId} and s.status = 'active'
    order by s.name
  `;
}
