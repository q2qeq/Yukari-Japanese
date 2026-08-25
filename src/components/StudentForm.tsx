"use client";

import { useActionState, useState } from "react";
import {
  createStudent,
  updateStudent,
  type StudentFormState,
} from "@/lib/actions/student-actions";
import type { StudentEditData, TeacherOption } from "@/lib/queries";

const STATUS_LABEL: Record<string, string> = {
  active: "재원",
  paused: "휴원",
  withdrawn: "퇴원",
};

export function StudentForm({
  mode,
  studentId,
  initial,
  teachers,
  returnTo,
}: {
  mode: "create" | "edit";
  studentId?: string;
  initial?: StudentEditData;
  teachers: TeacherOption[];
  returnTo: string;
}) {
  const action = mode === "edit" && studentId
    ? updateStudent.bind(null, studentId)
    : createStudent;
  const [state, formAction, pending] = useActionState<StudentFormState, FormData>(
    action,
    undefined,
  );
  const [isMinor, setIsMinor] = useState(initial?.is_minor ?? false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="returnTo" value={returnTo} />

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
          <label className="text-xs font-semibold text-ink-mid">전화번호</label>
          <input
            name="phone"
            type="tel"
            placeholder="010-0000-0000"
            defaultValue={initial?.phone ?? ""}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">레벨</label>
          <input
            name="level"
            placeholder="예: 초급"
            defaultValue={initial?.level ?? ""}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">담당 선생님</label>
          <select
            name="primaryTeacherId"
            defaultValue={initial?.primary_teacher_id ?? ""}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent bg-white"
          >
            <option value="">미지정</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-mid">상태</label>
          <select
            name="status"
            defaultValue={initial?.status ?? "active"}
            className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent bg-white"
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
        <label className="flex items-center gap-2 text-[13.5px] font-semibold">
          <input
            type="checkbox"
            name="isMinor"
            defaultChecked={initial?.is_minor}
            onChange={(e) => setIsMinor(e.target.checked)}
          />
          미성년 학생 (보호자 연락처 필수)
        </label>
        <label className="flex items-center gap-2 text-[13.5px] font-semibold">
          <input type="checkbox" name="kakaoFriend" defaultChecked={initial?.kakao_channel_friend} />
          카카오 채널 친구추가 완료
        </label>

        {isMinor && (
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-mid">보호자 이름</label>
              <input
                name="guardianName"
                defaultValue={initial?.guardian_name ?? ""}
                className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-mid">보호자 연락처 *</label>
              <input
                name="guardianPhone"
                type="tel"
                required={isMinor}
                defaultValue={initial?.guardian_phone ?? ""}
                className="h-11 rounded-lg border border-line px-3 text-[14px] outline-none focus:border-accent bg-white"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-mid">메모</label>
        <textarea
          name="memo"
          rows={3}
          defaultValue={initial?.memo ?? ""}
          className="rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-accent resize-none"
        />
      </div>

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
        {pending ? "저장 중..." : mode === "edit" ? "수정 저장" : "학생 등록"}
      </button>
    </form>
  );
}
