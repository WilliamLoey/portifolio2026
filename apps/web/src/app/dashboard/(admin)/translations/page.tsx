import type { Coverage } from '@portfolio/contracts';
import { LOCALE_NAMES, LOCALES } from '@portfolio/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, PageHeader, StatusPill } from '@/components/dashboard/ui';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Translations' };

const EDIT_PATH: Record<string, (id: string) => string> = {
  profile: () => '/dashboard/profile',
  project: (id) => `/dashboard/projects/${id}`,
  experience: (id) => `/dashboard/experience/${id}`,
  education: (id) => `/dashboard/education/${id}`,
  category: () => '/dashboard/skills',
};

export default async function TranslationsPage() {
  const { rows } = await adminGetOrEmpty<Coverage>('/admin/translations', { rows: [] });
  const missing = rows.reduce((n, r) => n + (LOCALES.length - r.locales.length), 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Translations"
        description={`${missing} missing language version${missing === 1 ? '' : 's'}. Missing languages show the English text to visitors, marked with the right lang attribute.`}
      />
      {rows.length === 0 ? (
        <EmptyState title="Nothing to translate yet" />
      ) : (
        <div className="overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[42rem] text-sm">
            <caption className="sr-only">Languages each item is written in</caption>
            <thead>
              <tr className="border-b border-line text-left font-mono text-2xs uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="px-4 py-3 font-medium">Item</th>
                {LOCALES.map((l) => <th key={l} scope="col" className="px-3 py-3 text-center font-medium" title={LOCALE_NAMES[l].english}>{LOCALE_NAMES[l].short}</th>)}
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <Link href={EDIT_PATH[row.type]!(row.id)} className="hover:text-cool hover:underline">{row.label}</Link>
                    <span className="block font-mono text-2xs text-muted">{row.type}</span>
                  </th>
                  {LOCALES.map((l) => {
                    const ok = row.locales.includes(l);
                    return (
                      <td key={l} className="px-3 py-3 text-center">
                        <span className={ok ? 'text-ok' : l === 'en' ? 'text-danger' : 'text-faint'}>{ok ? '●' : '○'}</span>
                        <span className="sr-only">{ok ? 'translated' : 'missing'}</span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">{row.status ? <StatusPill status={row.status} /> : <span className="font-mono text-2xs text-muted">live</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
