import type { ReactNode } from 'react';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { adminGet, requireSession } from '@/lib/admin.server';
import type { Overview } from '@portfolio/contracts';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const overview = await adminGet<Overview>('/admin/overview');

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_minmax(0,1fr)]">
      <DashboardNav user={session.user} unread={overview?.messages.unread ?? 0} />
      <main id="main" className="page-gutter mx-auto w-full max-w-6xl py-8 pb-28 lg:py-10">
        {children}
      </main>
    </div>
  );
}
