'use client';

import { THEME_STORAGE_KEY } from '@/lib/theme';

function currentTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Icons swap through CSS (`dark:`), so server and client markup always match. */
export function ThemeToggle({ label, className = '' }: { label: string; className?: string }) {
  function toggle() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.setAttribute('data-theme-switching', '');
    root.setAttribute('data-theme', next);
    requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-theme-switching')));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice still applies to this page view.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      className={`grid size-9 cursor-pointer place-items-center border border-line text-muted transition-colors hover:border-line-strong hover:text-fg ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="hidden size-4 dark:block" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden className="block size-4 dark:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    </button>
  );
}
