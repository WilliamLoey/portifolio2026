'use client';

import type { AdminUser } from '@portfolio/contracts';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '../site/theme-toggle';

const SECTIONS = [
  {
    label: 'Content',
    items: [
      { href: '/dashboard', label: 'Overview', exact: true },
      { href: '/dashboard/projects', label: 'Projects' },
      { href: '/dashboard/profile', label: 'Profile' },
      { href: '/dashboard/experience', label: 'Experience' },
      { href: '/dashboard/education', label: 'Education' },
      { href: '/dashboard/skills', label: 'Skills & categories' },
      { href: '/dashboard/links', label: 'Links & certificates' },
      { href: '/dashboard/media', label: 'Images' },
      { href: '/dashboard/translations', label: 'Translations' },
    ],
  },
  {
    label: 'Inbox',
    items: [{ href: '/dashboard/messages', label: 'Messages' }],
  },
  {
    label: 'Account',
    items: [{ href: '/dashboard/settings', label: 'Settings' }],
  },
];

export function DashboardNav({ user, unread }: { user: AdminUser; unread: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.replace('/dashboard/login');
    router.refresh();
  }

  return (
    <aside className="sticky top-0 z-30 border-b border-line bg-bg lg:h-dvh lg:border-b-0 lg:border-r">
      <div className="flex h-14 items-center justify-between px-4 lg:h-16 lg:px-5">
        <Link href="/dashboard" className="font-display text-lg font-extrabold">
          W<span className="text-cool">/</span>VL <span className="font-mono text-2xs font-normal text-muted">CMS</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle label="Switch theme" />
          <button
            type="button"
            className="grid size-9 cursor-pointer place-items-center border border-line lg:hidden"
            aria-expanded={open}
            aria-controls="dashboard-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              {open ? <path d="m5 5 10 10M15 5 5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </div>
      </div>

      <nav id="dashboard-nav" aria-label="Dashboard" className={`${open ? 'flex' : 'hidden'} flex-col gap-6 px-3 pb-6 lg:flex lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto`}>
        {SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 font-mono text-2xs uppercase tracking-[0.08em] text-faint">{section.label}</p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href, 'exact' in item && item.exact) ? 'page' : undefined}
                className="flex items-center justify-between px-3 py-2 text-sm text-muted transition-colors hover:bg-raised hover:text-fg aria-[current=page]:bg-surface aria-[current=page]:text-fg aria-[current=page]:shadow-[inset_2px_0_0_var(--cool)]"
              >
                {item.label}
                {item.href === '/dashboard/messages' && unread > 0 && (
                  <span className="rounded-full bg-warm px-1.5 font-mono text-2xs text-on-accent" aria-label={`${unread} unread`}>{unread}</span>
                )}
              </Link>
            ))}
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-2 border-t border-line px-3 pt-4">
          <a href="/en" target="_blank" rel="noopener" className="text-sm text-cool underline underline-offset-4">View site ↗</a>
          <p className="truncate text-xs text-muted" title={user.email}>{user.email}</p>
          <button type="button" onClick={signOut} disabled={signingOut} className="w-fit cursor-pointer text-sm text-muted underline underline-offset-4 hover:text-fg">
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </nav>
    </aside>
  );
}
