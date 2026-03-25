"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect } from "react";

type FormDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  confirmDisabled?: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

export function FormDialog({
  open,
  title,
  description,
  children,
  confirmLabel = "保存",
  cancelLabel = "取消",
  pending = false,
  confirmDisabled = false,
  onSubmit,
  onClose,
}: FormDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, pending]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending && !confirmDisabled) {
      onSubmit();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!pending) {
          onClose();
        }
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_32px_120px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {description ? <div className="text-sm leading-6 text-slate-600">{description}</div> : null}
        </div>

        <div className="mt-5 space-y-4">{children}</div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={pending || confirmDisabled}
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "处理中..." : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
