"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markAttendance } from "@/lib/actions/attendance-actions";
import type { AttendanceStatus, RosterRow } from "@/lib/types";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "出席",
  absent: "欠席",
  makeup_scheduled: "振替",
  excused: "公欠",
};

function balanceChip(remaining: number | null) {
  if (remaining === null) {
    return { label: "受講パスなし", className: "bg-surface text-ink-mid" };
  }
  if (remaining <= 0) {
    return { label: `${remaining}回分未払い`, className: "bg-critical-soft text-critical" };
  }
  if (remaining <= 2) {
    return { label: `残り${remaining}回`, className: "bg-warn-soft text-warn" };
  }
  return { label: `残り${remaining}回`, className: "bg-surface text-ink-mid" };
}

function statusButtonClass(active: boolean, status: AttendanceStatus) {
  if (!active) {
    return "border border-line text-ink-mid";
  }
  if (status === "present") return "bg-accent text-white";
  if (status === "absent") return "bg-critical text-white";
  return "bg-warn text-white";
}

export function AttendanceRoster({
  sessionId,
  initialRoster,
}: {
  sessionId: string;
  initialRoster: RosterRow[];
}) {
  const [roster, setRoster] = useState(initialRoster);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ studentId: string; message: string } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<RosterRow | null>(null);
  const [memo, setMemo] = useState("");
  const [, startTransition] = useTransition();

  async function applyStatus(row: RosterRow, status: AttendanceStatus, memoText?: string) {
    setRowError(null);
    setPendingId(row.student_id);
    const result = await markAttendance(sessionId, row.student_id, status, memoText);
    setPendingId(null);

    if (!result.ok) {
      setRowError({ studentId: row.student_id, message: result.error });
      return;
    }

    setRoster((prev) =>
      prev.map((r) =>
        r.student_id === row.student_id
          ? {
              ...r,
              attendance_status: status,
              remaining_sessions:
                result.remainingSessions !== null ? result.remainingSessions : r.remaining_sessions,
            }
          : r,
      ),
    );
  }

  function handleTap(row: RosterRow, status: AttendanceStatus) {
    const wouldGoIntoOrStayInDebt =
      status === "present" && row.remaining_sessions !== null && row.remaining_sessions <= 0;

    if (wouldGoIntoOrStayInDebt) {
      setMemo("");
      setConfirmTarget(row);
      return;
    }
    startTransition(() => {
      applyStatus(row, status);
    });
  }

  const checkedCount = roster.filter((r) => r.attendance_status !== null).length;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto">
        {roster.map((row) => {
          const chip = balanceChip(row.remaining_sessions);
          const isPending = pendingId === row.student_id;
          return (
            <div key={row.student_id} className="border-b border-line-light px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-[38px] h-[38px] rounded-full bg-surface flex items-center justify-center text-[13px] font-bold text-ink-mid shrink-0">
                  {row.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-[14.5px] font-semibold">{row.name}</span>
                  <span
                    className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${chip.className}`}
                  >
                    {chip.label}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(["present", "absent", "makeup_scheduled"] as AttendanceStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleTap(row, s)}
                      className={`w-8 h-8 rounded-lg text-[11px] font-bold disabled:opacity-50 ${statusButtonClass(
                        row.attendance_status === s,
                        s,
                      )}`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              {rowError?.studentId === row.student_id && (
                <p className="mt-2 text-[12px] text-critical flex items-center justify-between gap-2">
                  {rowError.message}
                  {rowError.message.includes("回数チャージ") && (
                    <Link
                      href={`/students/${row.student_id}/charge`}
                      className="underline shrink-0 font-semibold"
                    >
                      回数チャージへ
                    </Link>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-line-light px-5 py-3.5 gap-2">
        <p className="text-[12.5px] text-ink-mid">
          {roster.length}名中 <span className="text-ink font-bold">{checkedCount}名</span> チェック
          完了
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="text-[13px] text-ink-mid font-semibold">
            ホームへ
          </Link>
          <Link
            href={`/sessions/${sessionId}/journal`}
            className="rounded-lg bg-ink text-white text-[12.5px] font-bold px-3.5 py-2"
          >
            授業を終える（日誌へ）
          </Link>
        </div>
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setConfirmTarget(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[20px] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] px-[22px] pt-3 pb-6 flex flex-col gap-4">
            <div className="w-9 h-1 rounded-full bg-line mx-auto" />
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[15.5px] font-bold">未払いのまま出席処理しますか？</h2>
              <p className="text-[13px] text-ink-mid leading-relaxed">
                {confirmTarget.name}さんは受講回数が
                {confirmTarget.remaining_sessions === 0 ? "残っていません" : "不足しています"}。このまま処理すると
                <span className="text-critical font-bold">
                  {(confirmTarget.remaining_sessions ?? 0) - 1}回分未払い
                </span>
                として記録されます。
              </p>
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="メモ（任意）・例：来週火曜日に支払い予定"
              rows={2}
              className="border border-line-light rounded-[10px] px-3.5 py-3 text-[12.5px] outline-none focus:border-accent resize-none"
            />
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="flex-1 h-[46px] rounded-lg border border-line text-[14px] font-bold"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = confirmTarget;
                  const memoText = memo.trim() || undefined;
                  setConfirmTarget(null);
                  startTransition(() => {
                    applyStatus(target, "present", memoText);
                  });
                }}
                className="flex-[1.4] h-[46px] rounded-lg bg-critical text-white text-[14px] font-bold"
              >
                未払いのまま出席処理
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
