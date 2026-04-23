'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, FileOutput, FolderTree, Gauge, GitBranch, Layers, Settings, Sigma, Workflow } from 'lucide-react';
import { cn } from './utils';

const items = [
  { label: 'Corpus Builder', icon: Layers,    href: '/corpus' },
  { label: 'Sources',        icon: Database,   href: '/sources' },
  { label: 'Pipelines',      icon: Workflow,   href: '/pipelines' },
  { label: 'Collections',    icon: FolderTree, href: '/collections' },
  { label: 'Quality',        icon: Gauge,      href: '/quality' },
  { label: 'Deduplication',  icon: GitBranch,  href: '/deduplication' },
  { label: 'Schema',         icon: Sigma,      href: '/schema' },
  { label: 'Settings',       icon: Settings,   href: '/settings' },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-border bg-[#000000] p-4 lg:flex lg:sticky lg:top-0">
      {/* Logo */}
      <Link href="/corpus" className="mb-8 flex items-center gap-3">
        <Image src="/corpus-icon.svg" alt="CORPUS" width={36} height={36} priority />
        <span className="gradient-text text-2xl font-bold tracking-[0.18em]">CORPUS</span>
      </Link>

      <nav className="space-y-0.5" aria-label="Primary navigation">
        {items.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-brand-gradient-subtle text-white'
                  : 'text-muted hover:bg-panelAlt hover:text-slate-200',
              )}
            >
              <Icon
                className={cn('h-4 w-4 shrink-0', active && 'text-cyan')}
                aria-hidden
              />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Link
          href="/corpus"
          className="block w-full rounded-xl bg-brand-gradient px-4 py-2.5 text-center text-sm font-semibold text-white shadow-glow-accent transition-opacity hover:opacity-90"
        >
          Build Corpus
        </Link>
      </div>
    </aside>
  );
}
