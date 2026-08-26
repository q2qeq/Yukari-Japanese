"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createClass, updateClass, type ClassFormState } from "@/lib/actions/class-actions";
import { DAY_ORDER, dayLabel, findConflict, type ScheduleSlotForConflictCheck } from "@/lib/schedule-utils";
import type { ClassroomOption } from "@/lib/queries";

type SlotRow = { dayOfWeek: number; startTime: string; endTime: string };

type ClassInitial = {
  name: string;
  level: string | null;
  capacity: number;
  classroomId: string | null;
  status: "active" | "archived";
};

export function ClassScheduleForm({
  mode = "create",
  classId,
  classrooms,
  existingSlots,
  canManageClassrooms = false,
  initial,
  initialSlots,
}: {
  mode?: "create" | "edit";
  classId?: string;
  classrooms: ClassroomOption[];
  existingSlots: ScheduleSlotForConflictCheck[];
  canManageClassrooms?: boolean;
  initial?: ClassInitial;
  initialSlots?: SlotRow[];
}) {
  const isEdit = mode === "edit" && !!classId;
  const action = isEdit ? updateClass.bind(null, classId as string) : createClass;
  const [state, formAction, pending] = useActionState<ClassFormState, FormData>(
    action,
    undefined,
  );
  const [classroomId, setClassroomId] = useState<string>(initial?.classroomId ?? "");
  const [status, setStatus] = useState<"active" | "archived">(initial?.status ?? "active");
  const [slots, setSlots] = useState<SlotRow[]>(
    initialSlots && initialSlots.length > 0
      ? initialSlots
      : [{ dayOfWeek: 1, startTime: "19:00", endTime: "20:00" }],
  );

  const conflicts = useMemo(
    () =>
      slots.map((s) =>
        findConflict(existingSlots, classroomId || null, s.dayOfWeek, s.startTime, s.endTime, classId),
      ),
    [slots, classroomId, existingSlots, classId],
  );

  function updateSlot(idx: number, patch: Partial<SlotRow>) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addSlot() {
    setSlots((prev) => [...prev, { dayOfWeek: 1, startTime: "19:00", endTime: "20:00" }]);
  }

  function removeSlot(idx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="slotsJson" value={JSON.stringify(slots)} />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-mid">クラス名 *</label>
        <input
          name="name"
          required
          defaultValue={initial?.name}
          placeholder="例：月水夜間初級クラス"
          className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">レベル</label>
          <input
            name="level"
            defaultValue={initial?.level ?? ""}
            placeholder="例：初級"
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">定員</label>
          <input
            name="capacity"
            type="number"
            min={1}
            defaultValue={initial?.capacity ?? 10}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">教室</label>
          <select
            name="classroomId"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent bg-white"
          >
            <option value="">未指定</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.capacity ? ` (定員${c.capacity})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {classrooms.length === 0 && (
        <p className="text-[11.5px] text-warn bg-warn-soft rounded-lg px-3 py-2">
          まだ登録された教室がないため、教室を選択できません。{" "}
          {canManageClassrooms ? (
            <Link href="/director/classrooms" className="font-semibold underline">
              教室を追加しに行く
            </Link>
          ) : (
            "教室長に教室登録を依頼してください。"
          )}
        </p>
      )}

      {isEdit && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">ステータス</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("active")}
              className={`flex-1 h-10 rounded-lg text-[13px] font-semibold border transition-colors ${
                status === "active"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink-mid"
              }`}
            >
              運営中
            </button>
            <button
              type="button"
              onClick={() => setStatus("archived")}
              className={`flex-1 h-10 rounded-lg text-[13px] font-semibold border transition-colors ${
                status === "archived"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink-mid"
              }`}
            >
              保管（運営終了）
            </button>
          </div>
          <input type="hidden" name="status" value={status} />
          {status === "archived" && (
            <p className="text-[11.5px] text-ink-mid">
              保管処理すると、今後予定されている授業（まだ出席チェック前）が時間割から整理されます。すでに行われた授業の記録は残ります。
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-mid">曜日・時間 *</span>
          <button
            type="button"
            onClick={addSlot}
            className="text-[12px] font-semibold text-accent"
          >
            + 曜日を追加
          </button>
        </div>

        {slots.map((slot, idx) => (
          <div key={idx} className="rounded-xl border border-line-light p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <select
                value={slot.dayOfWeek}
                onChange={(e) => updateSlot(idx, { dayOfWeek: Number(e.target.value) })}
                className="h-10 rounded-lg border border-line px-2.5 text-[13.5px] outline-none focus:border-accent bg-white"
              >
                {DAY_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {dayLabel(d)}曜日
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => updateSlot(idx, { startTime: e.target.value })}
                className="h-10 rounded-lg border border-line px-2.5 text-[13.5px] outline-none focus:border-accent"
              />
              <span className="text-ink-mid">–</span>
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => updateSlot(idx, { endTime: e.target.value })}
                className="h-10 rounded-lg border border-line px-2.5 text-[13.5px] outline-none focus:border-accent"
              />
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlot(idx)}
                  className="ml-auto text-[12px] text-ink-mid font-semibold"
                >
                  削除
                </button>
              )}
            </div>
            {conflicts[idx] && (
              <p className="text-[12px] text-warn bg-warn-soft rounded-lg px-3 py-2 font-semibold">
                すでにこの時間に&quot;{conflicts[idx]}&quot;がこの教室を使用中です。
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11.5px] text-ink-mid">
        {isEdit
          ? "曜日・時間を変更すると、まだ行われていない予定の授業のみ反映されます。すでに出席チェック済みの授業記録はそのまま残ります。"
          : "保存すると、今日から8週間分の授業回が自動的に作成されます。"}
      </p>

      {state?.error && (
        <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3.5 py-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-accent text-white text-[15px] font-semibold disabled:opacity-60"
      >
        {pending ? "保存中..." : isEdit ? "編集を保存" : "クラス開設"}
      </button>
    </form>
  );
}
