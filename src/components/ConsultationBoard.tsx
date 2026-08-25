"use client";

import { useEffect, useState, useTransition } from "react";
import {
  updateConsultationStatus,
  updateConsultationNotes,
  type ConsultationStatus,
} from "@/lib/actions/consultation-actions";
import type { ConsultationRow } from "@/lib/director-queries";

const COLUMNS: { key: ConsultationStatus; label: string }[] = [
  { key: "new", label: "신규" },
  { key: "contacted", label: "연락함" },
  { key: "trial_scheduled", label: "체험 예정" },
  { key: "converted", label: "등록 완료" },
  { key: "lost", label: "이탈" },
];

const SOURCE_LABEL: Record<string, string> = {
  kakao_channel: "카카오 채널",
  phone: "전화",
  walk_in: "방문",
  referral: "지인 소개",
  online_form: "온라인 폼",
  other: "기타",
};

function fmtDate(d: string | Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

// DB의 date 컬럼은 서버->클라이언트 경계를 넘으며 실제로는 Date 인스턴스로
// 역직렬화된다(타입 선언상 string이어도 런타임엔 Date). <input type="date">에
// 넣을 수 있는 "YYYY-MM-DD" 문자열로 안전하게 변환한다.
function toDateInputValue(d: string | Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function ConsultationCard({
  row,
  onStatusChange,
  onSaveDetails,
}: {
  row: ConsultationRow;
  onStatusChange: (status: ConsultationStatus) => void;
  onSaveDetails: (notes: string, followUpAt: string | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(row.notes ?? "");
  const [followUpAt, setFollowUpAt] = useState(toDateInputValue(row.follow_up_at));
  const [saving, setSaving] = useState(false);

  const currentIdx = COLUMNS.findIndex((c) => c.key === row.status);
  const isDueToday =
    !!row.follow_up_at &&
    row.status !== "converted" &&
    row.status !== "lost" &&
    new Date(row.follow_up_at) <= new Date();

  async function saveDetails() {
    setSaving(true);
    await onSaveDetails(notes, followUpAt || null);
    setSaving(false);
    setExpanded(false);
  }

  return (
    <div className="bg-white rounded-xl border border-line-light p-3.5 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13.5px] font-bold">{row.name}</span>
          {row.phone && <span className="font-mono text-[11.5px] text-ink-mid">{row.phone}</span>}
        </div>
        <span className="rounded-full bg-surface text-ink-mid text-[10px] font-semibold px-2 py-0.5 shrink-0">
          {SOURCE_LABEL[row.source] ?? row.source}
        </span>
      </div>

      {row.interested_level && (
        <span className="text-[11.5px] text-ink-mid">관심: {row.interested_level}</span>
      )}

      {row.follow_up_at && (
        <span
          className={`w-fit rounded-full text-[10.5px] font-semibold px-2 py-0.5 ${
            isDueToday ? "bg-warn-soft text-warn" : "bg-surface text-ink-mid"
          }`}
        >
          후속 연락 {fmtDate(row.follow_up_at)}
        </span>
      )}

      {row.notes && !expanded && (
        <p className="text-[11.5px] text-ink-mid line-clamp-2">{row.notes}</p>
      )}

      {expanded && (
        <div className="flex flex-col gap-2 pt-1">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="메모"
            className="rounded-lg border border-line-light px-2.5 py-2 text-[12px] outline-none focus:border-accent resize-none"
          />
          <input
            type="date"
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
            className="h-9 rounded-lg border border-line-light px-2.5 text-[12px] outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex-1 h-8 rounded-lg border border-line text-[11.5px] font-semibold"
            >
              취소
            </button>
            <button
              type="button"
              onClick={saveDetails}
              disabled={saving}
              className="flex-1 h-8 rounded-lg bg-ink text-white text-[11.5px] font-semibold disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-line-light mt-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-ink-mid font-semibold"
        >
          {expanded ? "닫기" : "메모/후속일 편집"}
        </button>
        <div className="flex gap-1">
          {currentIdx > 0 && row.status !== "lost" && row.status !== "converted" && (
            <button
              type="button"
              onClick={() => onStatusChange(COLUMNS[currentIdx - 1].key)}
              className="w-6 h-6 rounded-md border border-line text-[11px] flex items-center justify-center"
              title="이전 단계로"
            >
              ←
            </button>
          )}
          {currentIdx < COLUMNS.length - 1 && row.status !== "lost" && (
            <button
              type="button"
              onClick={() => onStatusChange(COLUMNS[currentIdx + 1].key)}
              className="w-6 h-6 rounded-md border border-line text-[11px] flex items-center justify-center"
              title="다음 단계로"
            >
              →
            </button>
          )}
          {row.status !== "lost" && row.status !== "converted" && (
            <button
              type="button"
              onClick={() => onStatusChange("lost")}
              className="rounded-md border border-line text-[10.5px] px-1.5 h-6 text-ink-mid"
              title="이탈 처리"
            >
              이탈
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConsultationBoard({ initialRows }: { initialRows: ConsultationRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [, startTransition] = useTransition();

  // NewConsultationForm은 이 컴포넌트와 형제 관계라 새 상담 등록은 여기서
  // 알 수 없다. createConsultation의 revalidatePath로 서버가 이 페이지를
  // 다시 렌더링해 새 initialRows를 내려주면, 그 값으로 로컬 상태를
  // 다시 맞춘다 (낙관적 업데이트 이후에도 서버 값을 최종 진실로 취급).
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  function handleStatusChange(id: string, status: ConsultationStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(() => {
      updateConsultationStatus(id, status);
    });
  }

  async function handleSaveDetails(id: string, notes: string, followUpAt: string | null) {
    await updateConsultationNotes(id, notes, followUpAt);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, notes, follow_up_at: followUpAt } : r)));
  }

  return (
    <div className="grid grid-cols-5 gap-4">
      {COLUMNS.map((col) => {
        const colRows = rows.filter((r) => r.status === col.key);
        return (
          <div key={col.key} className="flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12.5px] font-bold text-ink-mid">{col.label}</span>
              <span className="text-[11px] text-ink-mid">{colRows.length}</span>
            </div>
            <div className="flex flex-col gap-2.5 min-h-[80px]">
              {colRows.map((row) => (
                <ConsultationCard
                  key={row.id}
                  row={row}
                  onStatusChange={(status) => handleStatusChange(row.id, status)}
                  onSaveDetails={(notes, followUpAt) => handleSaveDetails(row.id, notes, followUpAt)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
