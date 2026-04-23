'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = ['/dashboard','/pipelines','/sources','/collections','/quality','/deduplication','/schema','/exports','/settings'];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-4 flex gap-2 overflow-x-auto lg:hidden" aria-label="Mobile navigation">
      {links.map((href) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm ${active ? 'border-accent bg-accent/20 text-white' : 'border-border text-muted'}`}>{href.replace('/', '')}</Link>;
      })}
    </nav>
  );
}
