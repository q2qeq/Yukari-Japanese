-- ============================================================================
-- 일본어 학원 학생 관리 시스템 - 데이터베이스 스키마 (PostgreSQL / Supabase 기준)
-- 작성일: 2026-08-24
--
-- 설계 원칙
--  1. 결제(수강권)는 회차권 방식이며, 출석 체크 시 자동 차감된다. 차감 이력은
--     pass_deductions 테이블에 별도로 남겨 감사(audit)와 취소/복구가 가능하게 한다.
--  2. "반(class)"은 요일/시간이 반복되는 템플릿이고, 실제 각 회차는
--     class_sessions 테이블의 개별 날짜 인스턴스로 관리한다. 이렇게 분리해야
--     보강/휴강처럼 특정 날짜만 예외 처리하는 것이 쉬워진다.
--  3. 수업 연기(선생님/학생 사정)는 reschedule_requests로 요청을 남기고,
--     실제 대체 수업은 class_sessions에 is_makeup=true인 새 세션으로 생성해
--     original_session_id로 연결한다.
--  4. 카카오톡 알림톡/문자 발송은 모두 notification_logs에 기록해 발송 여부와
--     실패 사유를 추적할 수 있게 한다.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() 사용을 위함

-- ----------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신 트리거 함수
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. staff : 원장/선생님 계정 (PWA 로그인 주체)
-- ----------------------------------------------------------------------------
CREATE TYPE staff_role AS ENUM ('owner', 'teacher');

CREATE TABLE staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  role            staff_role NOT NULL DEFAULT 'teacher',
  phone           TEXT UNIQUE NOT NULL,
  email           TEXT,
  password_hash   TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE staff IS '원장/선생님 계정. 원장은 role=owner, 담당 수업이 있는 강사는 role=teacher.';

-- ----------------------------------------------------------------------------
-- 2. students : 학생
-- ----------------------------------------------------------------------------
CREATE TYPE student_status AS ENUM ('active', 'paused', 'withdrawn');

CREATE TABLE students (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  phone                 TEXT,
  is_minor              BOOLEAN NOT NULL DEFAULT false,
  guardian_name         TEXT,
  guardian_phone        TEXT,
  kakao_channel_friend  BOOLEAN NOT NULL DEFAULT false,
  level                 TEXT,
  primary_teacher_id    UUID REFERENCES staff(id) ON DELETE SET NULL,
  status                student_status NOT NULL DEFAULT 'active',
  registered_at         DATE NOT NULL DEFAULT current_date,
  withdrawn_at          DATE,
  memo                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_guardian_required_if_minor
    CHECK (is_minor = false OR guardian_phone IS NOT NULL)
);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_primary_teacher ON students(primary_teacher_id);
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN students.kakao_channel_friend IS '카카오 채널 친구추가 여부(참고용). 알림톡 발송 자체엔 친구추가가 필수는 아님.';

-- ----------------------------------------------------------------------------
-- 3. classes : 반 (정기 수업 템플릿)
-- ----------------------------------------------------------------------------
CREATE TYPE class_status AS ENUM ('active', 'archived');

CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,               -- 예: "월수 저녁 초급반"
  level       TEXT,
  teacher_id  UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  capacity    INT NOT NULL DEFAULT 10,
  status      class_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 반의 정기 시간표 (한 반이 주 2회 이상, 요일별로 다른 시간일 수 있어 별도 테이블로 분리)
CREATE TABLE class_schedule_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=일 ... 6=토
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  CONSTRAINT chk_time_order CHECK (end_time > start_time)
);
CREATE INDEX idx_slots_class ON class_schedule_slots(class_id);

-- ----------------------------------------------------------------------------
-- 4. class_enrollments : 학생-반 등록
-- ----------------------------------------------------------------------------
CREATE TYPE enrollment_status AS ENUM ('active', 'inactive');

CREATE TABLE class_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id      UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at   DATE NOT NULL DEFAULT current_date,
  left_at       DATE,
  status        enrollment_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);
-- 같은 반에 동시에 두 번 활성 등록되는 것을 방지
CREATE UNIQUE INDEX uq_active_enrollment
  ON class_enrollments(student_id, class_id) WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- 5. class_sessions : 반의 개별 회차(실제 날짜 인스턴스)
-- ----------------------------------------------------------------------------
CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'canceled');

CREATE TABLE class_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id            UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  teacher_id          UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT, -- 대타 가능성 고려해 별도 저장
  status              session_status NOT NULL DEFAULT 'scheduled',
  is_makeup           BOOLEAN NOT NULL DEFAULT false,
  original_session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  cancel_reason       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_class_date ON class_sessions(class_id, session_date);
CREATE INDEX idx_sessions_date ON class_sessions(session_date);
CREATE INDEX idx_sessions_teacher_date ON class_sessions(teacher_id, session_date);
CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON class_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN class_sessions.original_session_id IS '이 세션이 보강 세션일 때, 원래 결석/휴강했던 세션을 가리킴.';

-- ----------------------------------------------------------------------------
-- 6. payment_passes : 수강권 (회차권)
-- ----------------------------------------------------------------------------
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'card', 'other');
CREATE TYPE pass_status AS ENUM ('active', 'completed', 'expired', 'carried_over');

CREATE TABLE payment_passes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  pass_name           TEXT NOT NULL,          -- 예: "10회권"
  total_sessions      INT NOT NULL CHECK (total_sessions > 0),
  -- 잔여 회차는 음수가 될 수 있다: 결제 전에 "다음에 낼게요"로 출석을 계속하는
  -- 외상 상황을 표현하기 위함이다. 하한선(-50)은 업무 정책이 아니라 데이터 입력
  -- 실수를 잡기 위한 안전장치일 뿐, 외상 자체에 원장이 승인해야 하는 한도는 두지 않는다.
  remaining_sessions  INT NOT NULL CHECK (remaining_sessions >= -50),
  price               INT NOT NULL CHECK (price >= 0),  -- KRW
  payment_method      payment_method NOT NULL DEFAULT 'bank_transfer',
  purchased_at        DATE NOT NULL DEFAULT current_date,
  expires_at          DATE,
  carried_from_pass_id UUID REFERENCES payment_passes(id) ON DELETE SET NULL,
  -- 이전 수강권에서 넘어온 값. 남은 회차를 이월하면 양수, 외상(마이너스 잔여)을
  -- 정산하고 넘어오면 음수가 된다. 새 수강권의 remaining_sessions은
  -- total_sessions + carried_sessions 로 계산해 넣는다 (앱 로직).
  carried_sessions    INT NOT NULL DEFAULT 0,
  status              pass_status NOT NULL DEFAULT 'active',
  notified_low_balance BOOLEAN NOT NULL DEFAULT false, -- 잔여 1~2회 알림 중복 발송 방지
  notified_overdue    BOOLEAN NOT NULL DEFAULT false,  -- 잔여 0 이하(외상 시작) 알림 중복 발송 방지
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_passes_student_status ON payment_passes(student_id, status);
CREATE TRIGGER trg_passes_updated_at BEFORE UPDATE ON payment_passes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 한 학생당 활성 수강권은 하나만 유지 (여러 개 동시 활성 방지 -> 이월/신규 구매 로직 단순화)
-- 잔여가 0 이하로 내려가도 이 수강권은 status='active'를 유지한다: 학생이 결제
-- 없이 계속 출석하면 remaining_sessions만 계속 마이너스로 쌓이고, 실제 결제가
-- 이뤄지는 순간에야 이 수강권을 completed로 닫고 새 수강권을 만든다.
CREATE UNIQUE INDEX uq_active_pass_per_student
  ON payment_passes(student_id) WHERE status = 'active';

COMMENT ON COLUMN payment_passes.remaining_sessions IS
  '0 이하이면 외상(미수) 상태. 음수 자체가 "학생이 학원에 갚아야 할 회차 수"를 의미한다.';
COMMENT ON COLUMN payment_passes.carried_from_pass_id IS '이전 수강권에서 잔여/외상 회차를 이월받은 경우 그 이전 수강권을 가리킴.';

-- ----------------------------------------------------------------------------
-- 7. attendance : 출석
-- ----------------------------------------------------------------------------
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'makeup_scheduled', 'excused');

CREATE TABLE attendance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_session_id      UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status                attendance_status NOT NULL,
  checked_by            UUID REFERENCES staff(id) ON DELETE SET NULL,
  checked_at            TIMESTAMPTZ,
  memo                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_session_id, student_id)
);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_session ON attendance(class_session_id);
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN attendance.status IS
  'present=출석(회차 차감), absent=무단결석(정책상 차감 여부는 앱 로직), makeup_scheduled=보강예정(차감보류), excused=사유결석(차감보류)';

-- ----------------------------------------------------------------------------
-- 8. pass_deductions : 회차 차감/복구 이력 (감사 로그)
-- ----------------------------------------------------------------------------
CREATE TABLE pass_deductions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_pass_id   UUID NOT NULL REFERENCES payment_passes(id) ON DELETE CASCADE,
  attendance_id     UUID REFERENCES attendance(id) ON DELETE SET NULL,
  delta             INT NOT NULL,          -- 보통 출석 차감 시 -1, 취소/복구 시 +1
  reason            TEXT NOT NULL,         -- 예: '출석 체크', '출석 취소 복구', '수동 조정'
  created_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deductions_pass ON pass_deductions(payment_pass_id);
CREATE INDEX idx_deductions_attendance ON pass_deductions(attendance_id);

-- attendance 테이블에서 어떤 차감이 이 출석 기록으로 발생했는지 역참조가 필요하면
-- 애플리케이션에서 pass_deductions.attendance_id로 조회한다 (attendance -> deductions 1:N 가능,
-- 취소/재체크가 반복될 수 있으므로 attendance에 단일 FK를 두지 않고 이 방향으로만 연결한다).

-- ----------------------------------------------------------------------------
-- 9. reschedule_requests : 수업 연기/보강 요청
-- ----------------------------------------------------------------------------
CREATE TYPE requested_by_type AS ENUM ('teacher', 'student');
CREATE TYPE reschedule_status AS ENUM ('pending', 'scheduled', 'completed', 'canceled');

CREATE TABLE reschedule_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_session_id    UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id          UUID REFERENCES students(id) ON DELETE CASCADE, -- NULL이면 선생님 사정으로 반 전체 휴강
  requested_by        requested_by_type NOT NULL,
  requester_staff_id  UUID REFERENCES staff(id) ON DELETE SET NULL,
  reason              TEXT,
  status              reschedule_status NOT NULL DEFAULT 'pending',
  makeup_session_id   UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reschedule_session ON reschedule_requests(class_session_id);
CREATE INDEX idx_reschedule_student ON reschedule_requests(student_id);
CREATE TRIGGER trg_reschedule_updated_at BEFORE UPDATE ON reschedule_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. consultations : 상담/문의 (리드 관리)
-- ----------------------------------------------------------------------------
CREATE TYPE consultation_source AS ENUM ('kakao_channel', 'phone', 'walk_in', 'referral', 'online_form', 'other');
CREATE TYPE consultation_status AS ENUM ('new', 'contacted', 'trial_scheduled', 'converted', 'lost');

CREATE TABLE consultations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  phone                 TEXT,
  source                consultation_source NOT NULL DEFAULT 'other',
  interested_level      TEXT,
  status                consultation_status NOT NULL DEFAULT 'new',
  follow_up_at          DATE,
  converted_student_id  UUID REFERENCES students(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_follow_up ON consultations(follow_up_at);
CREATE TRIGGER trg_consultations_updated_at BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. notification_logs : 카카오 알림톡/문자 발송 이력
-- ----------------------------------------------------------------------------
CREATE TYPE notification_channel AS ENUM ('kakao_alimtalk', 'kakao_friendtalk', 'sms', 'app_push');
CREATE TYPE notification_trigger AS ENUM (
  'low_balance', 'payment_overdue', 'payment_confirm', 'class_change',
  'day_before_reminder', 'consultation_followup', 'custom'
);
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE notification_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  channel         notification_channel NOT NULL,
  trigger_type    notification_trigger NOT NULL,
  template_code   TEXT,
  content         TEXT NOT NULL,
  status          notification_status NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_recipient_present CHECK (student_id IS NOT NULL OR consultation_id IS NOT NULL)
);
CREATE INDEX idx_notifications_student ON notification_logs(student_id);
CREATE INDEX idx_notifications_status ON notification_logs(status);
CREATE INDEX idx_notifications_trigger ON notification_logs(trigger_type);

-- ----------------------------------------------------------------------------
-- 12. academy_holidays : 학원 휴무일 (공휴일 등)
-- ----------------------------------------------------------------------------
CREATE TABLE academy_holidays (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date  DATE NOT NULL UNIQUE,
  description   TEXT
);

-- ============================================================================
-- 참고용 뷰: 잔여 회차 1~2회 남은 학생 (알림 대상 조회에 사용)
-- ============================================================================
CREATE VIEW v_low_balance_students AS
SELECT
  p.id            AS pass_id,
  s.id            AS student_id,
  s.name          AS student_name,
  s.phone,
  s.guardian_phone,
  p.remaining_sessions,
  p.notified_low_balance
FROM payment_passes p
JOIN students s ON s.id = p.student_id
WHERE p.status = 'active'
  AND p.remaining_sessions BETWEEN 1 AND 2;

-- ============================================================================
-- 참고용 뷰: 외상(미수) 학생 - 활성 수강권의 잔여 회차가 0 이하로 내려간 경우.
-- 결제를 못 받은 상태로 출석을 계속 허용했을 때(외상) 이 뷰에 계속 잡힌다.
-- owed_sessions은 학생이 학원에 갚아야 할 회차 수(양수로 표시)이다.
-- ============================================================================
CREATE VIEW v_overdue_students AS
SELECT
  p.id                    AS pass_id,
  s.id                    AS student_id,
  s.name                  AS student_name,
  s.phone,
  s.guardian_phone,
  p.remaining_sessions,
  (-p.remaining_sessions) AS owed_sessions,
  p.notified_overdue,
  p.purchased_at          AS pass_purchased_at
FROM payment_passes p
JOIN students s ON s.id = p.student_id
WHERE p.status = 'active'
  AND p.remaining_sessions <= 0;

-- ============================================================================
-- 참고용 뷰: 학생별 미수(결제 필요) 후보 - 활성 등록은 있는데 활성 수강권 자체가
-- 없거나(등록 후 한 번도 결제 안 함), 있어도 잔여가 0 이하(외상 진행 중)인 경우.
-- 원장 대시보드의 "미수 현황"은 이 뷰 하나로 조회한다.
-- ============================================================================
CREATE VIEW v_unpaid_candidates AS
SELECT
  s.id                        AS student_id,
  s.name                      AS student_name,
  s.phone,
  p.id                        AS pass_id,
  p.remaining_sessions,
  CASE WHEN p.id IS NULL THEN NULL ELSE -p.remaining_sessions END AS owed_sessions,
  CASE WHEN p.id IS NULL THEN 'no_active_pass' ELSE 'overdue' END AS reason
FROM students s
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
