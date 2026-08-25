"use client";

import { useEffect, useState, useTransition } from "react";
import {
  scheduleMakeup,
  cancelRescheduleRequest,
} from "@/lib/actions/reschedule-actions";
import type { TeacherRescheduleRequest } from "@/lib/queries";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", weekday: "short" });
}

function PendingCard({
  row,
  onScheduled,
  onCanceled,
}: {
  row: TeacherRescheduleRequest;
  onScheduled: (id: string, date: string, start: string, end: string) => void;
  onCanceled: (id: string) => void;
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState(row.start_time.slice(0, 5));
  const [end, setEnd] = useState(row.end_time.slice(0, 5));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitSchedule() {
    setError(null);
    startTransition(async () => {
      const result = await scheduleMakeup(row.id, date, start, end);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onScheduled(row.id, date, start, end);
    });
  }

  function submitCancel() {
    startTransition(async () => {
      const result = await cancelRescheduleRequest(row.id);
      if (result.ok) onCanceled(row.id);
    });
  }

  return (
    <div className="border border-line-light rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-bold">{row.student_name}</span>
          <span className="text-[12px] text-ink-mid">
            {row.class_name} · 원래 {fmtDate(row.session_date)} {row.start_time.slice(0, 5)}
          </span>
        </div>
        <span className="rounded-full bg-warn-soft text-warn text-[10.5px] font-bold px-2.5 py-1 shrink-0">
          배정 대기
        </span>
      </div>
      {row.reason && <p className="text-[12px] text-ink-mid">사유: {row.reason}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-lg border border-line px-2.5 text-[12.5px] outline-none focus:border-accent"
        />
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="h-9 rounded-lg border border-line px-2.5 text-[12.5px] outline-none focus:border-accent w-[110px]"
        />
        <span className="text-ink-mid text-[12px]">~</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-9 rounded-lg border border-line px-2.5 text-[12.5px] outline-none focus:border-accent w-[110px]"
        />
      </div>

      {error && <p className="text-[12px] text-critical">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submitCancel}
          disabled={pending}
          className="flex-1 h-9 rounded-lg border border-line text-[12.5px] font-semibold disabled:opacity-60"
        >
          요청 취소
        </button>
        <button
          type="button"
          onClick={submitSchedule}
          disabled={pending || !date}
          className="flex-[1.5] h-9 rounded-lg bg-accent text-white text-[12.5px] font-bold disabled:opacity-60"
        >
          {pending ? "처리 중..." : "보강 확정"}
        </button>
      </div>
    </div>
  );
}

export function RescheduleManager({ initialRows }: { initialRows: TeacherRescheduleRequest[] }) {
  const [rows, setRows] = useState(initialRows);

  // 서버 액션(scheduleMakeup/cancelRescheduleRequest)이 끝나면 revalidatePath로
  // 이 페이지가 다시 렌더링되어 새 initialRows가 내려온다 — 그 값을 최종
  // 진실로 취급해 로컬 상태를 맞춰준다.
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  function handleScheduled(id: string, date: string, start: string, end: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "scheduled", makeup_date: date, makeup_start: start, makeup_end: end }
          : r,
      ),
    );
  }

  function handleCanceled(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const pendingRows = rows.filter((r) => r.status === "pending");
  const scheduledRows = rows.filter((r) => r.status === "scheduled");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold text-ink-mid uppercase tracking-wide mb-2.5">
          배정 대기중 ({pendingRows.length})
        </p>
        {pendingRows.length === 0 ? (
          <p className="text-[12.5px] text-ink-mid py-3">대기중인 연기 요청이 없어요.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingRows.map((row) => (
              <PendingCard
                key={row.id}
                row={row}
                onScheduled={handleScheduled}
                onCanceled={handleCanceled}
              />
            ))}
          </div>
        )}
      </div>

      {scheduledRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-mid uppercase tracking-wide mb-2.5">
            보강 확정됨 ({scheduledRows.length})
          </p>
          <div className="flex flex-col gap-2">
            {scheduledRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between border border-line-light rounded-xl px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13.5px] font-bold">{row.student_name}</span>
                  <span className="text-[12px] text-ink-mid">
                    {row.class_name} · 원래 {fmtDate(row.session_date)} →{" "}
                    보강 {row.makeup_date && fmtDate(row.makeup_date)} {row.makeup_start?.slice(0, 5)}
                  </span>
                </div>
                <span className="rounded-full bg-accent-soft text-accent text-[10.5px] font-bold px-2.5 py-1 shrink-0">
                  확정됨
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
