import { SidebarNav } from '@/app/components/sidebar-nav';
import { MobileNav } from '@/app/components/mobile-nav';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen bg-bg text-slate-100">
      <SidebarNav />
      <section className="flex-1 p-4 lg:p-6"><MobileNav />{children}</section>
    </main>
  );
}
