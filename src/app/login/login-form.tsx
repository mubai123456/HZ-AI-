"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="username" className="text-footnote font-semibold text-[var(--label-secondary)]">
          用户名
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="输入用户名"
          className="input"
          autoComplete="username"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-footnote font-semibold text-[var(--label-secondary)]">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="输入密码"
          className="input"
          autoComplete="current-password"
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--error-bg)] border border-[var(--error)]/20 text-[var(--error)]">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-subhead font-medium">{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full mt-6 h-12 text-base"
      >
        {pending ? (
          <>
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            登录中...
          </>
        ) : (
          "登录"
        )}
      </button>
    </form>
  );
}
