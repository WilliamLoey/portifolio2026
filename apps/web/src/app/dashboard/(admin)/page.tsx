import type { ContactMessage, Overview, Paginated } from '@portfolio/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/ui';
import { adminGet } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Overview' };

function Stat({ label, value, detail, href, tone }: { label: string; value: string | number; detail?: string; href: string; tone?: 'warn' | 'warm' }) {
  return (
    <Link href={href} className="group flex flex-col gap-2 border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <span className="font-mono text-2xs uppercase tracking-[0.08em] text-muted">{label}</span>
      <span className={`font-display text-4xl font-extrabold tabular-nums ${tone === 'warn' ? 'text-warn' : tone === 'warm' ? 'text-warm' : ''}`}>{value}</span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </Link>
  );
}

export default async function OverviewPage() {
  const [overview, messages] = await Promise.all([
    adminGet<Overview>('/admin/overview'),
    adminGet<Paginated<ContactMessage>>('/admin/messages?pageSize=5'),
  ]);
  if (!overview) return null;
  const coverage = overview.translations.expected
    ? Math.round((overview.translations.filled / overview.translations.expected) * 100)
    : 100;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="What visitors see, what is waiting to be published, and who wrote to you."
        actions={<Link href="/dashboard/projects/new" className="inline-flex h-10 items-center border border-fg bg-fg px-4 text-sm font-medium text-bg">New project</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published projects" value={overview.projects.published} detail={`${overview.projects.drafts} draft${overview.projects.drafts === 1 ? '' : 's'}`} href="/dashboard/projects" />
        <Stat
          label="Waiting to publish"
          value={overview.projects.changed}
          detail="Projects with unpublished edits"
          href="/dashboard/projects"
          tone={overview.projects.changed > 0 ? 'warn' : undefined}
        />
        <Stat label="Unread messages" value={overview.messages.unread} detail={`${overview.messages.last30Days} in the last 30 days`} href="/dashboard/messages" tone={overview.messages.unread > 0 ? 'warm' : undefined} />
        <Stat label="Translation coverage" value={`${coverage}%`} detail={`${overview.translations.filled} of ${overview.translations.expected} language versions`} href="/dashboard/translations" />
      </div>

      {overview.messages.undelivered > 0 && (
        <p role="alert" className="border-l-2 border-warn pl-3 text-sm">
          {overview.messages.undelivered} message{overview.messages.undelivered === 1 ? ' was' : 's were'} saved but not emailed to you. Check the email settings; the messages are safe in the inbox.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-4 border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest messages</h2>
            <Link href="/dashboard/messages" className="text-sm text-cool underline underline-offset-4">Open inbox</Link>
          </div>
          {messages && messages.items.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line">
              {messages.items.map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5 py-3">
                  <p className="flex items-center gap-2 text-sm">
                    {!m.readAt && <span className="size-1.5 rounded-full bg-warm" aria-label="Unread" />}
                    <span className="font-medium">{m.subject}</span>
                  </p>
                  <p className="text-xs text-muted">{m.name} · {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No messages yet. They appear here as soon as someone uses the contact form.</p>
          )}
        </section>

        <section className="flex flex-col gap-4 border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">Content</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted">Experience entries</dt><dd className="text-2xl font-semibold tabular-nums">{overview.content.experience}</dd></div>
            <div><dt className="text-muted">Education entries</dt><dd className="text-2xl font-semibold tabular-nums">{overview.content.education}</dd></div>
            <div><dt className="text-muted">Technologies</dt><dd className="text-2xl font-semibold tabular-nums">{overview.content.technologies}</dd></div>
            <div><dt className="text-muted">Images</dt><dd className="text-2xl font-semibold tabular-nums">{overview.media.count}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
