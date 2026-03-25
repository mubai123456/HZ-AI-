"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <svg
            className="h-8 w-8 text-rose-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-slate-950">页面出错</h2>
        <p className="mb-6 text-sm text-slate-500">
          {error.message || "发生了意外错误，请重试。"}
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-[#0066DD] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0055BB] shadow-sm"
        >
          重试
        </button>
      </div>
    </div>
  );
}
