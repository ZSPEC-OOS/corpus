import { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-panel p-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="gradient-text text-2xl font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StateCard({ message, cta }: { message: string; cta?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-panelAlt p-10 text-center text-sm text-muted">
      {message}
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  );
}
