-- ============================================================================
-- 2026-08-25 (3차 개발): 강의실 DB 추가
--  - classes(반)가 강의실 하나를 사용한다고 가정한다(같은 반의 모든 요일이
--    같은 강의실을 쓴다). 강의실이 여러 개가 아닌 소규모 학원 기준이라
--    class_schedule_slots마다 다른 강의실을 쓰는 케이스는 지원하지 않는다.
--  - 강의실/시간 충돌은 DB 레벨에서 막지 않는다(제약 조건 없음). 앱에서
--    반 개설 시 겹치는 예약이 있으면 경고만 보여주고 저장은 허용한다.
-- ============================================================================

CREATE TABLE classrooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  capacity    INT,
  memo        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_classrooms_updated_at BEFORE UPDATE ON classrooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE classes
  ADD COLUMN classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;
CREATE INDEX idx_classes_classroom ON classes(classroom_id);

COMMENT ON COLUMN classes.classroom_id IS '이 반이 사용하는 강의실. 반 개설 시 선택(선택 안 하면 NULL = 미지정).';
