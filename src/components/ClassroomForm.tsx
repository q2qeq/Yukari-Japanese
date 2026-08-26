"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClassroom, type ClassroomFormState } from "@/lib/actions/classroom-actions";

export function ClassroomForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ClassroomFormState, FormData>(
    createClassroom,
    undefined,
  );
  const submittedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false;
      if (!state?.error) {
        formRef.current?.reset();
        setOpen(false);
      }
    }
  }, [pending, state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-lg bg-accent text-white text-[13.5px] font-semibold px-4 py-2.5"
      >
        + 教室を追加
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        submittedRef.current = true;
        formAction(fd);
      }}
      className="bg-white rounded-2xl border border-line-light p-5 flex flex-col gap-4 max-w-md"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[14.5px] font-bold">教室を追加</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12.5px] text-ink-mid font-semibold"
        >
          キャンセル
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">名前 *</label>
          <input
            name="name"
            required
            placeholder="例：Aルーム"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">定員</label>
          <input
            name="capacity"
            type="number"
            min={1}
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-xs font-semibold text-ink-mid">メモ</label>
          <input
            name="memo"
            placeholder="例：2階奥"
            className="h-10 rounded-lg border border-line px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
      </div>

      {state?.error && <p className="text-[13px] text-critical">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit h-10 rounded-lg bg-accent text-white text-[13.5px] font-semibold px-5 disabled:opacity-60"
      >
        {pending ? "追加中..." : "追加"}
      </button>
    </form>
  );
}
