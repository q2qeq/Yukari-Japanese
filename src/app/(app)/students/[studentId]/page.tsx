import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getStudentDetail,
  getRecentAttendance,
  getRescheduleRequestsForStudent,
  getRecentNotifications,
  getEnrolledClassesForStudent,
} from "@/lib/queries";
import { dayLabel, hm } from "@/lib/schedule-utils";
import { NotifyButton } from "@/components/NotifyButton";
import { OCCUPATION_LABEL, STUDY_PURPOSE_LABEL, type StudentOccupation, type StudentStudyPurpose } from "@/lib/labels";

const NOTIFICATION_STATUS_LABEL: Record<string, string> = {
  sent: "送信済み",
  pending: "送信待ち",
  failed: "送信失敗",
};

const RESCHEDULE_STATUS_LABEL: Record<string, string> = {
  pending: "リクエスト待ち",
  scheduled: "振替確定",
  completed: "完了",
  canceled: "キャンセル済み",
};

const RESCHEDULE_STATUS_CLASS: Record<string, string> = {
  pending: "bg-warn-soft text-warn",
  scheduled: "bg-accent-soft text-accent",
  completed: "bg-good-soft text-good",
  canceled: "bg-surface text-ink-mid",
};

const STATUS_LABEL: Record<string, string> = {
  present: "出席",
  absent: "欠席",
  makeup_scheduled: "振替予定",
  excused: "公欠",
};

const STATUS_CLASS: Record<string, string> = {
  present: "bg-accent-soft text-accent",
  absent: "bg-critical-soft text-critical",
  makeup_scheduled: "bg-warn-soft text-warn",
  excused: "bg-surface text-ink-mid",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = await getStudentDetail(studentId);
  if (!student) notFound();

  const history = await getRecentAttendance(studentId);
  const rescheduleRequests = await getRescheduleRequestsForStudent(studentId);
  const notifications = await getRecentNotifications(studentId);
  const enrolledClasses = await getEnrolledClassesForStudent(studentId);

  const remaining = student.remaining_sessions;
  const isOverdue = remaining !== null && remaining <= 0;
  const isLowBalance = remaining !== null && remaining > 0 && remaining <= 2;
  const notifyKind: "low_balance" | "payment_overdue" | null = isOverdue
    ? "payment_overdue"
    : isLowBalance
      ? "low_balance"
      : null;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-2">
        <Link href="/" aria-label="戻る">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold">生徒情報</span>
      </div>

      <div className="flex-1 overflow-auto px-5 pb-6 flex flex-col gap-[22px]">
        <div className="flex items-center gap-3.5 pt-2">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-[19px] font-bold shrink-0 ${
              isOverdue ? "bg-critical-soft text-critical" : "bg-surface text-ink-mid"
            }`}
          >
            {student.name.slice(0, 1)}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[18px] font-bold">{student.name}</span>
            <span className="text-[12.5px] text-ink-mid">{student.level ?? "レベル未指定"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-[13px]">
          <div className="flex items-center gap-2.5">
            <span className="font-mono">{student.phone ?? "連絡先なし"}</span>
            <span className="text-ink-mid">・生徒</span>
          </div>
          {student.is_minor && (
            <div className="flex items-center gap-2.5">
              <span className="font-mono">{student.guardian_phone ?? "-"}</span>
              <span className="text-ink-mid">・保護者（未成年）</span>
            </div>
          )}
        </div>

        {(student.occupation || student.study_purpose || student.current_textbook) && (
          <div className="flex flex-wrap gap-1.5">
            {student.occupation && (
              <span className="rounded-full bg-surface text-ink-mid px-2.5 py-1 text-[11.5px] font-semibold">
                {OCCUPATION_LABEL[student.occupation as StudentOccupation] ?? student.occupation}
              </span>
            )}
            {student.study_purpose && (
              <span className="rounded-full bg-surface text-ink-mid px-2.5 py-1 text-[11.5px] font-semibold">
                目的：{STUDY_PURPOSE_LABEL[student.study_purpose as StudentStudyPurpose] ?? student.study_purpose}
              </span>
            )}
            {student.current_textbook && (
              <span className="rounded-full bg-accent-soft text-accent px-2.5 py-1 text-[11.5px] font-semibold">
                教材：{student.current_textbook}
              </span>
            )}
          </div>
        )}

        <div
          className={`rounded-2xl p-5 flex flex-col gap-1.5 ${
            isOverdue ? "bg-critical-soft" : "bg-surface"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isOverdue ? "text-critical" : "text-ink-mid"}`}>
              現在の残り
            </span>
            {isOverdue && (
              <span className="rounded-full bg-critical text-white text-[10.5px] font-bold px-2.5 py-1">
                未払い中
              </span>
            )}
          </div>
          <div className={`text-[34px] font-extrabold leading-none ${isOverdue ? "text-critical" : ""}`}>
            {remaining === null ? "–" : remaining}
            <span className="text-[15px] font-semibold">回</span>
          </div>
          {remaining === null && (
            <p className="text-xs text-ink-mid">登録された受講パスがありません。</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href={`/students/${studentId}/charge`}
            className="h-[46px] rounded-lg bg-critical text-white flex items-center justify-center gap-1.5 text-[14px] font-bold"
          >
            回数チャージ
          </Link>
          <div className="flex gap-2.5">
            {notifyKind ? (
              <NotifyButton studentId={studentId} kind={notifyKind} />
            ) : (
              <button
                type="button"
                disabled
                title="残り回数が十分あるため通知対象ではありません"
                className="flex-1 h-11 rounded-lg border border-line text-ink-mid text-[13px] font-bold opacity-40"
              >
                通知対象外
              </button>
            )}
            <Link
              href={`/students/${studentId}/reschedule`}
              className="flex-1 h-11 rounded-lg border border-line text-ink text-[13px] font-bold flex items-center justify-center"
            >
              延期リクエスト
            </Link>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide mb-2">
            受講中のクラス
          </span>
          {enrolledClasses.length === 0 && (
            <p className="text-[12.5px] text-ink-mid py-2">登録されたクラスがありません。</p>
          )}
          {enrolledClasses.map((c) => (
            <Link
              key={c.slot_id}
              href={`/classes/${c.class_id}`}
              className="flex items-center justify-between gap-2 py-2.5 border-b border-line-light last:border-none hover:opacity-80"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold">{c.class_name}</span>
                <span className="text-[11.5px] text-ink-mid">
                  {dayLabel(c.day_of_week)}曜日 {hm(c.start_time)}–{hm(c.end_time)}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-accent-soft text-accent px-2.5 py-0.5 text-[11px] font-semibold">
                {c.teacher_name}先生
              </span>
            </Link>
          ))}
        </div>

        {rescheduleRequests.filter((r) => r.status !== "canceled").length > 0 && (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide mb-2">
              延期リクエスト
            </span>
            {rescheduleRequests
              .filter((r) => r.status !== "canceled")
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2.5 border-b border-line-light last:border-none"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold">{r.class_name}</span>
                    <span className="text-[11.5px] text-ink-mid">
                      元{" "}
                      {new Date(r.session_date).toLocaleDateString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                      })}
                      {r.makeup_date &&
                        ` → 振替 ${new Date(r.makeup_date).toLocaleDateString("ja-JP", {
                          month: "2-digit",
                          day: "2-digit",
                        })} ${r.makeup_start?.slice(0, 5)}`}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${RESCHEDULE_STATUS_CLASS[r.status]}`}
                  >
                    {RESCHEDULE_STATUS_LABEL[r.status]}
                  </span>
                </div>
              ))}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide mb-2">
              通知送信履歴
            </span>
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-2 py-2.5 border-b border-line-light last:border-none"
              >
                <span className="text-[12px] text-ink-mid line-clamp-1">{n.content}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    n.status === "sent"
                      ? "bg-good-soft text-good"
                      : n.status === "pending"
                        ? "bg-surface text-ink-mid"
                        : "bg-critical-soft text-critical"
                  }`}
                >
                  {NOTIFICATION_STATUS_LABEL[n.status]}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col">
          <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide mb-2">
            最近の出席履歴
          </span>
          {history.length === 0 && (
            <p className="text-[12.5px] text-ink-mid py-3">出席履歴がありません。</p>
          )}
          {history.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-line-light last:border-none"
            >
              <span className="font-mono text-[12.5px] text-ink-mid">
                {new Date(h.session_date).toLocaleDateString("ja-JP", {
                  month: "2-digit",
                  day: "2-digit",
                  weekday: "short",
                })}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[h.status]}`}
              >
                {STATUS_LABEL[h.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
