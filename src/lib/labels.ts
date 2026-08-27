// 여러 화면에서 공유하는 한국어 코드값 -> 일본어 표시 라벨 매핑.
// (앱 UI 전체가 일본어로 번역되어 있으므로 - 7차 참고 - 새로 추가하는
//  라벨도 일본어로 통일한다.)

export type StudentOccupation =
  | "elementary"
  | "middle_school"
  | "high_school"
  | "university"
  | "leave_of_absence"
  | "job_seeker"
  | "worker"
  | "homemaker"
  | "freelancer";

export const OCCUPATION_LABEL: Record<StudentOccupation, string> = {
  elementary: "小学生",
  middle_school: "中学生",
  high_school: "高校生",
  university: "大学生",
  leave_of_absence: "休学生",
  job_seeker: "就活生",
  worker: "会社員",
  homemaker: "主婦",
  freelancer: "フリーランス",
};

export const OCCUPATION_OPTIONS = Object.keys(OCCUPATION_LABEL) as StudentOccupation[];

export type StudentStudyPurpose =
  | "business"
  | "work"
  | "study_abroad"
  | "hobby"
  | "culture"
  | "credit"
  | "other";

export const STUDY_PURPOSE_LABEL: Record<StudentStudyPurpose, string> = {
  business: "ビジネス",
  work: "業務",
  study_abroad: "留学",
  hobby: "趣味",
  culture: "教養",
  credit: "単位",
  other: "その他",
};

export const STUDY_PURPOSE_OPTIONS = Object.keys(STUDY_PURPOSE_LABEL) as StudentStudyPurpose[];

export type AchievementGrade = "A" | "B" | "C";

export const ACHIEVEMENT_LABEL: Record<AchievementGrade, string> = {
  A: "A（よくできた）",
  B: "B（できた）",
  C: "C（要復習）",
};

export const ACHIEVEMENT_OPTIONS: AchievementGrade[] = ["A", "B", "C"];

export const ACHIEVEMENT_BADGE_CLASS: Record<AchievementGrade, string> = {
  A: "bg-good-soft text-good",
  B: "bg-accent-soft text-accent",
  C: "bg-warn-soft text-warn",
};

export type PaymentMethodFull = "cash" | "bank_transfer" | "card" | "other";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodFull, string> = {
  cash: "現金",
  bank_transfer: "口座振込",
  card: "カード",
  other: "その他",
};

// 카드 결제 수수료율(1%). 저장하지 않고 조회/표시 시점에 계산한다.
export const CARD_FEE_RATE = 0.01;

export function cardNetAmount(price: number, method: string): number {
  if (method !== "card") return price;
  return Math.round(price * (1 - CARD_FEE_RATE));
}
