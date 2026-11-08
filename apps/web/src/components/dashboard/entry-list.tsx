import type { PublicationStatus } from '@portfolio/contracts';
import { LOCALES } from '@portfolio/contracts';
import Link from 'next/link';
import { StatusPill } from './ui';

export function EntryList({
  items,
}: {
  items: { id: string; href: string; title: string; subtitle: string; status: PublicationStatus; locales: string[] }[];
}) {
  return (
    <ul className="border border-line bg-surface">
      {items.map((item) => (
        <li key={item.id} className="border-b border-line last:border-0">
          <Link href={item.href} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-raised/50">
            <span className="flex flex-col">
              <span className="font-medium">{item.title}</span>
              <span className="font-mono text-2xs text-muted">{item.subtitle}</span>
            </span>
            <span className="flex items-center gap-4">
              <span className="font-mono text-2xs">
                {LOCALES.map((l) => (
                  <span key={l} className={`mr-1.5 ${item.locales.includes(l) ? '' : 'text-faint line-through'}`}>{l === 'pt-BR' ? 'PT' : l.toUpperCase()}</span>
                ))}
              </span>
              <StatusPill status={item.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
