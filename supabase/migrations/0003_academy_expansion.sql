-- ============================================================================
-- 0003_academy_expansion.sql (2026-08-27, 8차 개발)
-- 사용자 요청 9건 반영:
--  1) 미지급 통지(v_unpaid_candidates/v_low_balance_students)에 담당 선생님 추가
--  2) 학생 직업/수강목적 추가
--  3) 학생 현재 교재 추가 (학생 상세 + 반 등록 명단에서 노출)
--  4) 상담관리 등록완료(converted) 단계에 담당 선생님 배정
--  5) 결제(수강권) dismissed_at(원장 대시보드 확인 처리), 카드 수수료는 조회 시 계산
--  6) 수업일지(class_journals): 수업 내용 + 성취도(A/B/C)
--  7) 월별 관리일지(monthly_reports)
--  8) 6,7은 students/staff를 FK로 참조하므로 자연히 두 DB에 연결됨
--  9) 선생님 급여 계산 편의를 위한 staff.pay_rate_per_session
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2) 학생: 직업 / 수강목적 / 3) 현재 교재
-- ----------------------------------------------------------------------------
CREATE TYPE student_occupation AS ENUM (
  'elementary', 'middle_school', 'high_school', 'university',
  'leave_of_absence', 'job_seeker', 'worker', 'homemaker', 'freelancer'
);
CREATE TYPE student_study_purpose AS ENUM (
  'business', 'work', 'study_abroad', 'hobby', 'culture', 'credit', 'other'
);

ALTER TABLE students
  ADD COLUMN occupation student_occupation,
  ADD COLUMN study_purpose student_study_purpose,
  ADD COLUMN current_textbook TEXT;

COMMENT ON COLUMN students.current_textbook IS '현재 공부중인 교재(자유 텍스트). 학생 상세 화면과 반 등록 명단(시간표 쪽)에서 함께 노출.';

-- ----------------------------------------------------------------------------
-- 4) 상담관리: 등록완료(converted) 단계에서 담당 선생님 배정
-- ----------------------------------------------------------------------------
ALTER TABLE consultations
  ADD COLUMN assigned_teacher_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 5) 결제(수강권): 원장 대시보드에서 "확인(X)" 처리해 대시보드에서만 숨김.
-- 지불내역(전체 내역) 화면에는 dismissed_at과 무관하게 계속 표시된다.
-- 카드 수수료(1%)는 저장하지 않고 조회 시 계산한다(정책 변경에 유연하게 대응).
-- ----------------------------------------------------------------------------
ALTER TABLE payment_passes
  ADD COLUMN dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN payment_passes.dismissed_at IS '원장 대시보드의 "最近の支払い" 위젯에서 확인(X) 처리한 시각. NULL이면 대시보드에 계속 노출. 支払い履歴(전체 내역) 화면에는 영향 없음.';

-- ----------------------------------------------------------------------------
-- 9) 선생님 급여 계산 편의: 세션당 단가(선택 입력, 원장이 선생님 상세에서 설정)
-- ----------------------------------------------------------------------------
ALTER TABLE staff
  ADD COLUMN pay_rate_per_session INT CHECK (pay_rate_per_session IS NULL OR pay_rate_per_session >= 0);

COMMENT ON COLUMN staff.pay_rate_per_session IS '급여 계산기에서 재사용할 세션(출석 1회)당 단가(원). 원장이 선생님 상세 화면에서 설정, 선택 입력.';

-- ----------------------------------------------------------------------------
-- 6) 수업일지: 출석 체크 후 수업을 마치면 학생별로 내용 + 성취도(A/B/C) 기록
-- ----------------------------------------------------------------------------
CREATE TYPE achievement_grade AS ENUM ('A', 'B', 'C');

CREATE TABLE class_journals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_session_id  UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id        UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  content           TEXT NOT NULL,
  achievement       achievement_grade NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_session_id, student_id)
);
CREATE INDEX idx_journals_student ON class_journals(student_id);
CREATE INDEX idx_journals_teacher ON class_journals(teacher_id);
CREATE INDEX idx_journals_session ON class_journals(class_session_id);
CREATE TRIGGER trg_class_journals_updated_at BEFORE UPDATE ON class_journals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE class_journals IS '선생님이 출석체크 후 "授業を終える"(수업 마치기)에서 학생별로 남기는 수업일지. 원장 대시보드에서 확인 + 학생별/일자별/선생님별 아카이브 조회.';

-- ----------------------------------------------------------------------------
-- 7) 월별 관리일지: 매월 초, 담당 학생별로 학습 내용을 5~6문장 정도 작성
-- ----------------------------------------------------------------------------
CREATE TABLE monthly_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id    UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  report_month  DATE NOT NULL, -- 항상 그 달 1일로 정규화해서 저장 (예: 2026-08-01)
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, report_month)
);
CREATE INDEX idx_monthly_reports_student ON monthly_reports(student_id);
CREATE INDEX idx_monthly_reports_teacher ON monthly_reports(teacher_id);
CREATE INDEX idx_monthly_reports_month ON monthly_reports(report_month);
CREATE TRIGGER trg_monthly_reports_updated_at BEFORE UPDATE ON monthly_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE monthly_reports IS '선생님이 매월 초 담당 학생별로 작성해 원장에게 보내는 월별 관리일지. 원장 대시보드에서 확인 + 학생별/일자별/선생님별 아카이브 조회.';

-- ----------------------------------------------------------------------------
-- 1) 미지급 통지에 담당 선생님 표시: 뷰 재정의(CREATE OR REPLACE)
-- ----------------------------------------------------------------------------
-- 주의: CREATE OR REPLACE VIEW는 기존 컬럼의 이름/순서를 바꿀 수 없고 맨 뒤에
-- 새 컬럼을 추가하는 것만 허용한다. 그래서 primary_teacher_id/name은 기존
-- 컬럼들 뒤에 이어붙인다(스키마 누적본인 schema.sql은 신규 생성이라 순서
-- 제약이 없지만, 여기서도 통일해서 헷갈리지 않게 한다).
CREATE OR REPLACE VIEW v_low_balance_students AS
SELECT
  p.id            AS pass_id,
  s.id            AS student_id,
  s.name          AS student_name,
  s.phone,
  s.guardian_phone,
  p.remaining_sessions,
  p.notified_low_balance,
  s.primary_teacher_id,
  st.name         AS primary_teacher_name
FROM payment_passes p
JOIN students s ON s.id = p.student_id
LEFT JOIN staff st ON st.id = s.primary_teacher_id
WHERE p.status = 'active'
  AND p.remaining_sessions BETWEEN 1 AND 2;

CREATE OR REPLACE VIEW v_overdue_students AS
SELECT
  p.id                    AS pass_id,
  s.id                    AS student_id,
  s.name                  AS student_name,
  s.phone,
  s.guardian_phone,
  p.remaining_sessions,
  (-p.remaining_sessions) AS owed_sessions,
  p.notified_overdue,
  p.purchased_at          AS pass_purchased_at,
  s.primary_teacher_id,
  st.name                 AS primary_teacher_name
FROM payment_passes p
JOIN students s ON s.id = p.student_id
LEFT JOIN staff st ON st.id = s.primary_teacher_id
WHERE p.status = 'active'
  AND p.remaining_sessions <= 0;

CREATE OR REPLACE VIEW v_unpaid_candidates AS
SELECT
  s.id                        AS student_id,
  s.name                      AS student_name,
  s.phone,
  p.id                        AS pass_id,
  p.remaining_sessions,
  CASE WHEN p.id IS NULL THEN NULL ELSE -p.remaining_sessions END AS owed_sessions,
  CASE WHEN p.id IS NULL THEN 'no_active_pass' ELSE 'overdue' END AS reason,
  s.primary_teacher_id,
  st.name                     AS primary_teacher_name
FROM students s
LEFT JOIN staff st ON st.id = s.primary_teacher_id
LEFT JOIN payment_passes p
  ON p.student_id = s.id AND p.status = 'active' AND p.remaining_sessions <= 0
WHERE s.status = 'active'
  AND EXISTS (
    SELECT 1 FROM class_enrollments ce
    WHERE ce.student_id = s.id AND ce.status = 'active'
  )
  AND NOT EXISTS (
    SELECT 1 FROM payment_passes p2
    WHERE p2.student_id = s.id AND p2.status = 'active' AND p2.remaining_sessions > 0
  );
