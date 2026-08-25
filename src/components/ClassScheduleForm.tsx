"use client";

import { useActionState, useMemo, useState } from "react";
import { createClass, type CreateClassState } from "@/lib/actions/class-actions";
import { DAY_ORDER, dayLabel, findConflict, type ScheduleSlotForConflictCheck } from "@/lib/schedule-utils";
import type { ClassroomOption } from "@/lib/queries";

type SlotRow = { dayOfWeek: number; startTime: string; endTime: string };

export function ClassScheduleForm({
  classrooms,
  existingSlots,
}: {
  classrooms: ClassroomOption[];
  existingSlots: ScheduleSlotForConflictCheck[];
}) {
  const [state, formAction, pending] = useActionState<CreateClassState, FormData>(
    createClass,
    undefined,
  );
  const [classroomId, setClassroomId] = useState<string>("");
  const [slots, setSlots] = useState<SlotRow[]>([{ dayOfWeek: 1, startTime: "19:00", endTime: "20:00" }]);

  const conflicts = useMemo(
    () =>
      slots.map((s) =>
        findConflict(existingSlots, classroomId || null, s.dayOfWeek, s.startTime, s.endTime),
      ),
    [slots, classroomId, existingSlots],
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
        <label className="text-xs font-semibold text-ink-mid">반 이름 *</label>
        <input
          name="name"
          required
          placeholder="예: 월수 저녁 초급반"
          className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">레벨</label>
          <input
            name="level"
            placeholder="예: 초급"
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">정원</label>
          <input
            name="capacity"
            type="number"
            min={1}
            defaultValue={10}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">강의실</label>
          <select
            name="classroomId"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent bg-white"
          >
            <option value="">미지정</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.capacity ? ` (정원 ${c.capacity})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-mid">요일·시간 *</span>
          <button
            type="button"
            onClick={addSlot}
            className="text-[12px] font-semibold text-accent"
          >
            + 요일 추가
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
                    {dayLabel(d)}요일
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
                  삭제
                </button>
              )}
            </div>
            {conflicts[idx] && (
              <p className="text-[12px] text-warn bg-warn-soft rounded-lg px-3 py-2 font-semibold">
                이미 이 시간에 &quot;{conflicts[idx]}&quot;이(가) 이 강의실을 사용 중이에요.
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11.5px] text-ink-mid">
        저장하면 오늘부터 8주치 수업 회차가 자동으로 만들어져요.
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
        {pending ? "저장 중..." : "반 개설"}
      </button>
    </form>
  );
}
