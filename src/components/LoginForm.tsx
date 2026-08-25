"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth-actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-xs font-semibold text-ink-mid">
          전화번호
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="010-1234-5678"
          autoComplete="tel"
          required
          className="h-12 rounded-lg border border-line px-3.5 text-[15px] outline-none focus:border-accent"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-semibold text-ink-mid">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-lg border border-line px-3.5 text-[15px] outline-none focus:border-accent"
        />
      </div>

      {state?.error && (
        <p className="text-[13px] text-critical" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-accent text-white text-[15px] font-semibold disabled:opacity-60"
      >
        {pending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
