import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";

type PageTemplateProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function PageTemplate({
  eyebrow,
  title,
  description,
  action,
  toolbar,
  children,
  className,
  contentClassName,
}: PageTemplateProps) {
  return (
    <div className={["space-y-6", className].filter(Boolean).join(" ")}>
      <PageHeader eyebrow={eyebrow} title={title} description={description} action={action} />
      {toolbar ? <div>{toolbar}</div> : null}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
