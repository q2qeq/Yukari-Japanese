import "server-only";
import { sql } from "@/lib/db";

// ----------------------------------------------------------------------------
// 원장 대시보드 전용 쿼리 모음. 선생님 앱(queries.ts)과 분리해 관리합니다.
// ----------------------------------------------------------------------------

export type TeacherTodayOverview = {
  session_id: string;
  class_name: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
  enrolled_count: number;
  checked_count: number;
};

export async function getTodayOverviewAllTeachers() {
  return sql<TeacherTodayOverview[]>`
    select
      cs.id as session_id,
      c.name as class_name,
      st.name as teacher_name,
      cs.start_time,
      cs.end_time,
      (select count(*)::int from class_enrollments ce
         where ce.class_id = c.id and ce.status = 'active') as enrolled_count,
      (select count(*)::int from attendance a
         where a.class_session_id = cs.id) as checked_count
    from class_sessions cs
    join classes c on c.id = cs.class_id
    join staff st on st.id = cs.teacher_id
    where cs.session_date = current_date
      and cs.status != 'canceled'
    order by cs.start_time
  `;
}

export type UnpaidCandidate = {
  student_id: string;
  student_name: string;
  phone: string | null;
  pass_id: string | null;
  remaining_sessions: number | null;
  owed_sessions: number | null;
  reason: "no_active_pass" | "overdue";
};

export async function getUnpaidCandidates() {
  return sql<UnpaidCandidate[]>`
    select student_id, student_name, phone, pass_id, remaining_sessions, owed_sessions, reason
    from v_unpaid_candidates
    order by (owed_sessions is not null) desc, owed_sessions desc nulls last, student_name
  `;
}

export type LowBalanceStudent = {
  pass_id: string;
  student_id: string;
  student_name: string;
  phone: string | null;
  guardian_phone: string | null;
  remaining_sessions: number;
  notified_low_balance: boolean;
};

export async function getLowBalanceStudents() {
  return sql<LowBalanceStudent[]>`
    select pass_id, student_id, student_name, phone, guardian_phone,
           remaining_sessions, notified_low_balance
    from v_low_balance_students
    order by remaining_sessions, student_name
  `;
}

export type ConsultationRow = {
  id: string;
  name: string;
  phone: string | null;
  source: string;
  interested_level: string | null;
  status: "new" | "contacted" | "trial_scheduled" | "converted" | "lost";
  follow_up_at: string | null;
  notes: string | null;
  created_at: string;
};

export async function getConsultations() {
  return sql<ConsultationRow[]>`
    select id, name, phone, source, interested_level, status,
           follow_up_at, notes, created_at
    from consultations
    order by created_at desc
  `;
}

// ----------------------------------------------------------------------------
// 선생님(staff) DB 관리 (원장 전용)
// ----------------------------------------------------------------------------

export type StaffListRow = {
  id: string;
  name: string;
  role: "owner" | "teacher";
  phone: string;
  email: string | null;
  is_active: boolean;
  class_count: number;
  student_count: number;
};

export async function listStaff() {
  return sql<StaffListRow[]>`
    select
      st.id, st.name, st.role, st.phone, st.email, st.is_active,
      (select count(*)::int from classes c where c.teacher_id = st.id and c.status = 'active') as class_count,
      (select count(*)::int from students s where s.primary_teacher_id = st.id and s.status = 'active') as student_count
    from staff st
    order by (st.role = 'owner') desc, (st.is_active) desc, st.name
  `;
}

export type StaffEditData = {
  id: string;
  name: string;
  role: "owner" | "teacher";
  phone: string;
  email: string | null;
  is_active: boolean;
};

export async function getStaffForEdit(staffId: string) {
  const rows = await sql<StaffEditData[]>`
    select id, name, role, phone, email, is_active from staff where id = ${staffId}
  `;
  return rows[0] ?? null;
}

// ----------------------------------------------------------------------------
// 전체 시간표 (모든 선생님 합산) / 강의실 기준 시간표
// ----------------------------------------------------------------------------

export type AllClassScheduleRow = {
  class_id: string;
  class_name: string;
  level: string | null;
  teacher_id: string;
  teacher_name: string;
  classroom_id: string | null;
  classroom_name: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  enrolled_count: number;
};

export async function getAllClassesWithSchedule() {
  return sql<AllClassScheduleRow[]>`
    select
      c.id as class_id, c.name as class_name, c.level,
      c.teacher_id, st.name as teacher_name,
      c.classroom_id, cr.name as classroom_name,
      slot.day_of_week, slot.start_time, slot.end_time,
      (select count(*)::int from class_enrollments ce
         where ce.class_id = c.id and ce.status = 'active') as enrolled_count
    from classes c
    join class_schedule_slots slot on slot.class_id = c.id
    join staff st on st.id = c.teacher_id
    left join classrooms cr on cr.id = c.classroom_id
    where c.status = 'active'
    order by slot.day_of_week, slot.start_time
  `;
}

export type ClassroomRow = { id: string; name: string; capacity: number | null; memo: string | null };

export async function listClassroomsFull() {
  return sql<ClassroomRow[]>`
    select id, name, capacity, memo from classrooms order by name
  `;
}

// ----------------------------------------------------------------------------
// 결제 내역 (원장 대시보드에서 확인)
// ----------------------------------------------------------------------------

export type PaymentHistoryRow = {
  id: string;
  student_id: string;
  student_name: string;
  pass_name: string;
  total_sessions: number;
  price: number;
  payment_method: "cash" | "bank_transfer" | "card" | "other";
  purchased_at: string;
  carried_sessions: number;
  remaining_sessions: number;
};

export async function getRecentPayments(limit = 100) {
  return sql<PaymentHistoryRow[]>`
    select
      p.id, p.student_id, s.name as student_name, p.pass_name, p.total_sessions,
      p.price, p.payment_method, p.purchased_at, p.carried_sessions, p.remaining_sessions
    from payment_passes p
    join students s on s.id = p.student_id
    order by p.purchased_at desc, p.created_at desc
    limit ${limit}
  `;
}

export async function getTodayPaymentStats() {
  const [row] = await sql<{ count: number; total: number }[]>`
    select count(*)::int as count, coalesce(sum(price), 0)::int as total
    from payment_passes
    where purchased_at = current_date
  `;
  return row ?? { count: 0, total: 0 };
}

// ----------------------------------------------------------------------------
// 선생님 상세 화면: 이 선생님이 담당하는 반과, 각 반에 등록된 학생 목록
// (director/staff/[staffId] 조회 페이지에서 사용)
// ----------------------------------------------------------------------------

export type StaffClassRow = {
  class_id: string;
  class_name: string;
  level: string | null;
  classroom_name: string | null;
};

export async function getClassesForStaff(staffId: string) {
  return sql<StaffClassRow[]>`
    select c.id as class_id, c.name as class_name, c.level, cr.name as classroom_name
    from classes c
    left join classrooms cr on cr.id = c.classroom_id
    where c.teacher_id = ${staffId} and c.status = 'active'
    order by c.name
  `;
}

export type StaffClassSlotRow = {
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export async function getScheduleSlotsForStaffClasses(staffId: string) {
  return sql<StaffClassSlotRow[]>`
    select slot.class_id, slot.day_of_week, slot.start_time, slot.end_time
    from class_schedule_slots slot
    join classes c on c.id = slot.class_id
    where c.teacher_id = ${staffId} and c.status = 'active'
    order by slot.day_of_week, slot.start_time
  `;
}

export type StaffStudentRow = {
  class_id: string;
  student_id: string;
  student_name: string;
  remaining_sessions: number | null;
};

export async function getRosterForStaffClasses(staffId: string) {
  return sql<StaffStudentRow[]>`
    select
      ce.class_id, s.id as student_id, s.name as student_name,
      p.remaining_sessions
    from class_enrollments ce
    join classes c on c.id = ce.class_id
    join students s on s.id = ce.student_id
    left join payment_passes p on p.student_id = s.id and p.status = 'active'
    where c.teacher_id = ${staffId} and ce.status = 'active' and c.status = 'active'
    order by s.name
  `;
}

export async function getDashboardCounts() {
  const [[unpaid], [lowBalance], [newConsult], [dueFollowUp]] = await Promise.all([
    sql<{ count: number }[]>`select count(*)::int as count from v_unpaid_candidates`,
    sql<{ count: number }[]>`select count(*)::int as count from v_low_balance_students`,
    sql<{ count: number }[]>`select count(*)::int as count from consultations where status = 'new'`,
    sql<{ count: number }[]>`
      select count(*)::int as count from consultations
      where status not in ('converted', 'lost') and follow_up_at <= current_date
    `,
  ]);
  return {
    unpaidCount: unpaid.count,
    lowBalanceCount: lowBalance.count,
    newConsultationCount: newConsult.count,
    dueFollowUpCount: dueFollowUp.count,
  };
}
