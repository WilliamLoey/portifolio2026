'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';

const NAV = [
  { href: '/work', key: 'work' },
  { href: '/about', key: 'about' },
  { href: '/#contact', key: 'contact' },
] as const;

export function SiteHeader() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (href: string) => href !== '/#contact' && pathname.startsWith(href);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] bg-fg px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('skip')}
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
        <div className="page-gutter mx-auto flex h-16 max-w-page items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight" aria-label={`William Van Loey, ${t('home')}`}>
            W<span className="text-cool">/</span>VL
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className="relative text-sm text-muted transition-colors hover:text-fg aria-[current=page]:text-fg aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-[22px] aria-[current=page]:after:h-px aria-[current=page]:after:bg-cool"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LocaleSwitcher label={t('language')} />
            <ThemeToggle label={t('theme')} />
            <button
              type="button"
              className="grid size-9 cursor-pointer place-items-center border border-line md:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t('close') : t('menu')}
              onClick={() => setOpen((v) => !v)}
            >
              <svg viewBox="0 0 20 20" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                {open ? <path d="m5 5 10 10M15 5 5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label="Main" className="page-gutter border-t border-line bg-bg pb-6 md:hidden">
            <ul className="flex flex-col">
              {NAV.map((item) => (
                <li key={item.key} className="border-b border-line">
                  <Link href={item.href} className="block py-4 font-display text-2xl font-semibold" onClick={() => setOpen(false)}>
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}
