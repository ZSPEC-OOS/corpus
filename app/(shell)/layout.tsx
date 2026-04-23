import { SidebarNav } from '@/app/components/sidebar-nav';
import { MobileHeader, MobileNav } from '@/app/components/mobile-nav';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen bg-bg text-slate-100">
      {/* Desktop sidebar — hidden on mobile */}
      <SidebarNav />

      <section className="flex min-w-0 flex-1 flex-col">
        {/* Mobile logo header — hidden on desktop */}
        <MobileHeader />

        {/* Main content — pb-24 reserves space above iPhone tab bar */}
        <div className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </div>
      </section>

      {/* iPhone bottom tab bar — hidden on desktop */}
      <MobileNav />
    </main>
  );
}
