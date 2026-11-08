'use client';

import { LOCALE_NAMES, LOCALES, Locale } from '@portfolio/contracts';
import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Keeps the visitor on the same page when switching language.
 * A disclosure menu (button + list of links) that works with keyboard and screen readers.
 */
export function LocaleSwitcher({ label }: { label: string }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    // @ts-expect-error -- params of the current route are passed through unchanged.
    router.replace({ pathname, params }, { locale: next, scroll: false });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${label}: ${LOCALE_NAMES[locale].native}`}
        data-testid="locale-switcher"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 cursor-pointer items-center gap-1.5 border border-line px-3 font-mono text-xs font-medium text-fg transition-colors hover:border-line-strong"
      >
        {LOCALE_NAMES[locale].short}
        <svg viewBox="0 0 12 12" aria-hidden className={`size-2.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="m2 4 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <ul id={menuId} className="absolute right-0 top-11 z-50 min-w-48 border border-line bg-surface py-1 shadow-xl shadow-black/10">
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                lang={l}
                aria-current={l === locale ? 'true' : undefined}
                onClick={() => choose(l)}
                className="flex w-full cursor-pointer items-center justify-between gap-6 px-4 py-2 text-left text-sm text-muted hover:bg-raised hover:text-fg aria-[current]:text-fg"
              >
                {LOCALE_NAMES[l].native}
                <span className="font-mono text-2xs text-faint">{LOCALE_NAMES[l].short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
