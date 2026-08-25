"use client";

import { useActionState } from "react";
import {
  createStaff,
  updateStaff,
  type StaffFormState,
} from "@/lib/actions/staff-actions";
import type { StaffEditData } from "@/lib/director-queries";

export function StaffForm({
  mode,
  staffId,
  initial,
}: {
  mode: "create" | "edit";
  staffId?: string;
  initial?: StaffEditData;
}) {
  const action = mode === "edit" && staffId ? updateStaff.bind(null, staffId) : createStaff;
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-md">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-mid">이름 *</label>
        <input
          name="name"
          required
          defaultValue={initial?.name}
          className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">역할</label>
          <select
            name="role"
            defaultValue={initial?.role ?? "teacher"}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent bg-white"
          >
            <option value="teacher">선생님</option>
            <option value="owner">원장</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">전화번호 *</label>
          <input
            name="phone"
            type="tel"
            required
            placeholder="010-0000-0000"
            defaultValue={initial?.phone ?? ""}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-xs font-semibold text-ink-mid">이메일</label>
          <input
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-xs font-semibold text-ink-mid">
            비밀번호 {mode === "edit" ? "(변경 시에만 입력)" : "*"}
          </label>
          <input
            name="password"
            type="password"
            required={mode === "create"}
            placeholder={mode === "edit" ? "비워두면 기존 비밀번호 유지" : ""}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
      </div>

      {mode === "edit" && (
        <label className="flex items-center gap-2 text-[13.5px] font-semibold">
          <input type="checkbox" name="isActive" defaultChecked={initial?.is_active ?? true} />
          활성 계정 (로그인 가능)
        </label>
      )}

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
        {pending ? "저장 중..." : mode === "edit" ? "수정 저장" : "선생님 등록"}
      </button>
    </form>
  );
}
