import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[0.8125rem] font-medium text-muted">{eyebrow}</div>}
        <h1 className="truncate text-[2rem] font-extrabold sm:text-[2.75rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[0.875rem] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
