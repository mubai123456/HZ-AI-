import type { ReactNode } from "react";

export function SurfaceCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-headline font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-subhead text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
