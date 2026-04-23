import { Database, FileOutput, FolderTree, Gauge, GitBranch, LayoutDashboard, Settings, Sigma, Workflow } from 'lucide-react';
import { PipelineStatus } from '@/lib/types';
import { cn } from './utils';
import { StatusBadge } from './status-badge';

const items = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '#' },
  { label: 'Pipelines', icon: Workflow, href: '#', active: true },
  { label: 'Sources', icon: Database, href: '#' },
  { label: 'Collections', icon: FolderTree, href: '#' },
  { label: 'Quality', icon: Gauge, href: '#' },
  { label: 'Deduplication', icon: GitBranch, href: '#' },
  { label: 'Schema', icon: Sigma, href: '#' },
  { label: 'Exports', icon: FileOutput, href: '#' },
  { label: 'Settings', icon: Settings, href: '#' },
];

export function SidebarNav({ runStatus }: { runStatus?: PipelineStatus }) {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-border bg-[#060b15] p-4 lg:flex">
      <h1 className="mb-8 text-3xl font-semibold tracking-[0.22em]">CORPUS</h1>
      <nav className="space-y-1" aria-label="Primary navigation">
        {items.map(({ label, icon: Icon, active, href }) => (
          <a key={label} href={href} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent', active && 'bg-panel text-white')}>
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-auto space-y-4">
        <section className="rounded-lg border border-border bg-panel p-3 text-sm text-slate-300">
          <div className="mb-2 text-xs uppercase text-muted">Current Pipeline</div>
          {runStatus ? <StatusBadge status={runStatus} /> : <div className="text-muted">No active run</div>}
        </section>
        <button className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Create New Pipeline</button>
      </div>
    </aside>
  );
}
