import type { AdminExperience } from '@portfolio/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EntryList } from '@/components/dashboard/entry-list';
import { EmptyState, PageHeader } from '@/components/dashboard/ui';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Experience' };

export default async function ExperiencePage() {
  const items = await adminGetOrEmpty<AdminExperience[]>('/admin/experience', []);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Experience"
        description="Shown newest first: current roles, then by start date."
        actions={<Link href="/dashboard/experience/new" className="inline-flex h-10 items-center border border-fg bg-fg px-4 text-sm font-medium text-bg">Add experience</Link>}
      />
      {items.length === 0 ? (
        <EmptyState title="No experience yet" text="Add your roles with real titles and dates. Drafts stay private until published." action={<Link href="/dashboard/experience/new" className="text-sm text-cool underline underline-offset-4">Add a role</Link>} />
      ) : (
        <EntryList
          items={items.map((e) => ({
            id: e.id,
            href: `/dashboard/experience/${e.id}`,
            title: e.translations.en?.role ?? '(untitled role)',
            subtitle: `${e.company} · ${e.startDate} → ${e.endDate ?? 'present'}`,
            status: e.publication.status,
            locales: Object.keys(e.translations),
          }))}
        />
      )}
    </div>
  );
}
