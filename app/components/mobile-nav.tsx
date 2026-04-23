'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Layers, Settings, Sigma, Workflow } from 'lucide-react';
import { cn } from './utils';

const tabs = [
  { label: 'Builder',   icon: Layers,   href: '/corpus' },
  { label: 'Sources',   icon: Database, href: '/sources' },
  { label: 'Pipelines', icon: Workflow, href: '/pipelines' },
  { label: 'Schema',    icon: Sigma,    href: '/schema' },
  { label: 'Settings',  icon: Settings, href: '/settings' },
] as const;

export function MobileHeader() {
  return (
    <header className="flex items-center gap-2 border-b border-border bg-black px-4 py-3 safe-top lg:hidden">
      <Image src="/corpus-icon.svg" alt="" width={28} height={28} />
      <span className="gradient-text text-lg font-bold tracking-[0.18em]">CORPUS</span>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-black/95 backdrop-blur-md safe-bottom lg:hidden"
      aria-label="Mobile navigation"
    >
      {tabs.map(({ label, icon: Icon, href }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              'min-h-[56px] justify-center',
              active ? 'text-cyan' : 'text-muted',
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'drop-shadow-[0_0_6px_rgba(0,229,255,0.7)]')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
