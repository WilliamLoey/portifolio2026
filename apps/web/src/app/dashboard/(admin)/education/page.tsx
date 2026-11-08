import type { AdminEducation } from '@portfolio/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EntryList } from '@/components/dashboard/entry-list';
import { EmptyState, PageHeader } from '@/components/dashboard/ui';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Education' };

export default async function EducationPage() {
  const items = await adminGetOrEmpty<AdminEducation[]>('/admin/education', []);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Education"
        description="Shown newest first: ongoing programs, then by end year."
        actions={<Link href="/dashboard/education/new" className="inline-flex h-10 items-center border border-fg bg-fg px-4 text-sm font-medium text-bg">Add education</Link>}
      />
      {items.length === 0 ? (
        <EmptyState title="No education yet" text="Add degrees and programs with their official names." action={<Link href="/dashboard/education/new" className="text-sm text-cool underline underline-offset-4">Add an entry</Link>} />
      ) : (
        <EntryList
          items={items.map((e) => ({
            id: e.id,
            href: `/dashboard/education/${e.id}`,
            title: e.translations.en?.degree ?? '(untitled)',
            subtitle: `${e.institution} · ${e.startYear} → ${e.endYear ?? '…'}`,
            status: e.publication.status,
            locales: Object.keys(e.translations),
          }))}
        />
      )}
    </div>
  );
}
