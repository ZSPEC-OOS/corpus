import { PipelineStatus } from '@/lib/types';
import { cn } from '@/app/components/utils';

const map: Record<PipelineStatus, string> = {
  idle: 'bg-slate-800 text-slate-300 border-slate-700',
  waiting: 'bg-slate-800 text-slate-200 border-slate-700',
  running: 'bg-blue-950/60 text-blue-300 border-blue-700',
  completed: 'bg-emerald-950/60 text-emerald-300 border-emerald-700',
  failed: 'bg-rose-950/70 text-rose-300 border-rose-700',
  skipped: 'bg-slate-900 text-slate-400 border-slate-700',
  canceled: 'bg-slate-900 text-slate-400 border-slate-700',
};

export function StatusBadge({ status }: { status: PipelineStatus }) {
  return <span className={cn('rounded-full border px-2 py-0.5 text-xs capitalize', map[status])}>{status}</span>;
}
