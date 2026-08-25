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
