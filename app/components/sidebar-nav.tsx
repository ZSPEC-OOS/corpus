import { Database, FileOutput, FolderTree, Gauge, GitBranch, LayoutDashboard, Settings, Sigma, Workflow } from 'lucide-react';
import { cn } from './utils';

const items = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Pipelines', icon: Workflow, active: true },
  { label: 'Sources', icon: Database },
  { label: 'Collections', icon: FolderTree },
  { label: 'Quality', icon: Gauge },
  { label: 'Deduplication', icon: GitBranch },
  { label: 'Schema', icon: Sigma },
  { label: 'Exports', icon: FileOutput },
  { label: 'Settings', icon: Settings },
];

export function SidebarNav({ runStatus }: { runStatus?: string }) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-[#060b15] p-4">
      <h1 className="mb-8 text-3xl font-semibold tracking-[0.22em]">CORPUS</h1>
      <nav className="space-y-1">
        {items.map(({ label, icon: Icon, active }) => (
          <button key={label} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-panel', active && 'bg-panel text-white')}>
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-4">
        <section className="rounded-lg border border-border bg-panel p-3 text-sm text-slate-300">
          <div className="text-xs uppercase text-muted">Current Pipeline</div>
          <div className="mt-1 font-medium text-slate-100">{runStatus ? runStatus : 'No active run'}</div>
        </section>
        <button className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Create New Pipeline</button>
      </div>
    </aside>
  );
}
