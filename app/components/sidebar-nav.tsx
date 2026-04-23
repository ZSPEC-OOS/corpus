'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, FileOutput, FolderTree, Gauge, GitBranch, LayoutDashboard, Settings, Sigma, Workflow } from 'lucide-react';
import { PipelineStatus } from '@/lib/types';
import { cn } from './utils';
import { StatusBadge } from './status-badge';

const items = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Pipelines', icon: Workflow, href: '/pipelines' },
  { label: 'Sources', icon: Database, href: '/sources' },
  { label: 'Collections', icon: FolderTree, href: '/collections' },
  { label: 'Quality', icon: Gauge, href: '/quality' },
  { label: 'Deduplication', icon: GitBranch, href: '/deduplication' },
  { label: 'Schema', icon: Sigma, href: '/schema' },
  { label: 'Exports', icon: FileOutput, href: '/exports' },
  { label: 'Settings', icon: Settings, href: '/settings' },
] as const;

export function SidebarNav({ runStatus }: { runStatus?: PipelineStatus }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-border bg-[#060b15] p-4 lg:flex lg:sticky lg:top-0">
      <h1 className="mb-8 text-3xl font-semibold tracking-[0.22em]">CORPUS</h1>
      <nav className="space-y-1" aria-label="Primary navigation">
        {items.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={label} href={href} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent', active && 'bg-panel text-white')}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-4">
        <section className="rounded-lg border border-border bg-panel p-3 text-sm text-slate-300">
          <div className="mb-2 text-xs uppercase text-muted">Current Pipeline</div>
          {runStatus ? <StatusBadge status={runStatus} /> : <div className="text-muted">No active run</div>}
        </section>
        <Link href="/pipelines" className="block w-full rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-white">Create New Pipeline</Link>
      </div>
    </aside>
  );
}
