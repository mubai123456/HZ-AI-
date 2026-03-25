import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <p className="text-[12px] font-semibold text-[var(--label-quaternary)] uppercase tracking-wider">{eyebrow}</p>
        <h1 className="text-[31px] font-bold text-[var(--label-primary)] mt-1 leading-tight">{title}</h1>
        <p className="text-[17px] text-[var(--label-tertiary)] mt-2 max-w-2xl leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );
}
