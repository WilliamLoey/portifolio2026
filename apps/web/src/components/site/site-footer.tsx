import type { SitePayload } from '@portfolio/contracts';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function SiteFooter({ links }: { links: SitePayload['socialLinks'] }) {
  const t = await getTranslations('footer');
  return (
    <footer className="border-t border-line">
      <div className="page-gutter mx-auto flex max-w-page flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <p className="max-w-md text-sm text-muted">{t('builtWith')}</p>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs">
          {links.map((link) => (
            <li key={link.url}>
              <a
                href={link.kind === 'email' ? `mailto:${link.url.replace(/^mailto:/, '')}` : link.url}
                rel={link.kind === 'email' ? undefined : 'me noopener noreferrer'}
                target={link.kind === 'email' ? undefined : '_blank'}
                className="text-muted hover:text-fg"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <Link href="/colophon" className="text-muted hover:text-fg">{t('colophon')}</Link>
          </li>
          <li>
            <a href="#main" className="text-muted hover:text-fg">{t('top')} ↑</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
