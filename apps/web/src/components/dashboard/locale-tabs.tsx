'use client';

import { LOCALE_NAMES, LOCALES, Locale } from '@portfolio/contracts';
import { useId, type ReactNode } from 'react';

/**
 * One tab per language. A dot marks languages that still need work:
 * red when a field has an error, grey when the language is empty (falls back to English).
 */
export function LocaleTabs({
  active,
  onChange,
  filled,
  errors,
  children,
}: {
  active: Locale;
  onChange: (locale: Locale) => void;
  filled: Partial<Record<Locale, boolean>>;
  errors: Partial<Record<Locale, boolean>>;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="Language" className="flex flex-wrap border-b border-line">
        {LOCALES.map((locale) => {
          const selected = locale === active;
          const state = errors[locale] ? 'error' : filled[locale] ? 'filled' : 'empty';
          return (
            <button
              key={locale}
              id={`${id}-${locale}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(locale)}
              onKeyDown={(e) => {
                // Roving focus (WAI-ARIA tabs pattern): arrows move both selection and focus.
                const i = LOCALES.indexOf(locale);
                const next =
                  e.key === 'ArrowRight' ? LOCALES[(i + 1) % LOCALES.length]
                  : e.key === 'ArrowLeft' ? LOCALES[(i - 1 + LOCALES.length) % LOCALES.length]
                  : e.key === 'Home' ? LOCALES[0]
                  : e.key === 'End' ? LOCALES[LOCALES.length - 1]
                  : undefined;
                if (!next) return;
                e.preventDefault();
                onChange(next);
                document.getElementById(`${id}-${next}`)?.focus();
              }}
              className="-mb-px flex cursor-pointer items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm text-muted hover:text-fg aria-selected:border-cool aria-selected:text-fg"
            >
              {LOCALE_NAMES[locale].short}
              <span
                aria-label={state === 'error' ? 'has errors' : state === 'empty' ? (locale === 'en' ? 'required' : 'not translated') : 'translated'}
                className={`size-1.5 rounded-full ${state === 'error' ? 'bg-danger' : state === 'filled' ? 'bg-ok' : 'bg-line-strong'}`}
              />
            </button>
          );
        })}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${active}`} className="pt-5">
        {active !== 'en' && !filled[active] && (
          <p className="mb-4 border-l-2 border-line-strong pl-3 text-xs text-muted">
            {LOCALE_NAMES[active].english} is empty: visitors reading in {LOCALE_NAMES[active].english} see the English version. Leave every field empty to keep it that way.
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
