'use client';

import type { ContactMessage, Paginated } from '@portfolio/contracts';
import { LOCALE_NAMES } from '@portfolio/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminRequest, ApiRequestError } from '@/lib/admin-client';
import { Button, ConfirmButton, EmptyState, useToast } from './ui';

export function MessageInbox({ page, filter }: { page: Paginated<ContactMessage>; filter: 'all' | 'unread' }) {
  const [items, setItems] = useState(page.items);
  const [open, setOpen] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function setRead(message: ContactMessage, read: boolean) {
    try {
      const updated = await adminRequest<ContactMessage>('PATCH', `/messages/${message.id}`, { read });
      setItems((list) => list.map((m) => (m.id === updated.id ? updated : m)));
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not update', 'error');
    }
  }

  async function toggle(message: ContactMessage) {
    const next = open === message.id ? null : message.id;
    setOpen(next);
    if (next && !message.readAt) await setRead(message, true);
  }

  async function remove(message: ContactMessage) {
    try {
      await adminRequest('DELETE', `/messages/${message.id}`);
      setItems((list) => list.filter((m) => m.id !== message.id));
      toast('Message deleted');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not delete', 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Filter" className="flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <Link key={f} href={`/dashboard/messages?filter=${f}`} aria-current={filter === f ? 'true' : undefined} className="border border-line px-3 py-1.5 text-sm text-muted aria-[current]:border-fg aria-[current]:text-fg">
            {f === 'all' ? 'All' : 'Unread'}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title={filter === 'unread' ? 'No unread messages' : 'No messages yet'} text="Messages sent through the contact form appear here, and are also emailed to you." />
      ) : (
        <ul className="border border-line bg-surface">
          {items.map((m) => (
            <li key={m.id} className="border-b border-line last:border-0">
              <button type="button" onClick={() => toggle(m)} aria-expanded={open === m.id} className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-raised/50">
                <span className="flex min-w-0 items-center gap-3">
                  <span aria-label={m.readAt ? 'Read' : 'Unread'} className={`size-2 shrink-0 rounded-full ${m.readAt ? 'bg-transparent' : 'bg-warm'}`} />
                  <span className="min-w-0">
                    <span className={`block truncate ${m.readAt ? '' : 'font-semibold'}`}>{m.subject}</span>
                    <span className="block font-mono text-2xs text-muted">{m.name} · {m.email}</span>
                  </span>
                </span>
                <span className="font-mono text-2xs text-muted">
                  {!m.delivered && <span className="mr-2 text-warn">not emailed</span>}
                  {new Date(m.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </button>
              {open === m.id && (
                <div className="flex flex-col gap-4 border-t border-line px-5 py-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                  <p className="font-mono text-2xs text-muted">Written from the {LOCALE_NAMES[m.locale].english} site</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="inline-flex h-8 items-center border border-fg bg-fg px-3 text-xs font-medium text-bg">Reply by email</a>
                    <Button size="sm" variant="ghost" onClick={() => setRead(m, false)}>Mark unread</Button>
                    <ConfirmButton size="sm" variant="ghost" title="Delete this message?" description="It cannot be recovered." confirmLabel="Delete" onConfirm={() => remove(m)}>Delete</ConfirmButton>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {page.totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          {page.page > 1 ? <Link href={`/dashboard/messages?filter=${filter}&page=${page.page - 1}`} className="text-cool underline">← Newer</Link> : <span />}
          <span className="font-mono text-2xs text-muted">Page {page.page} of {page.totalPages}</span>
          {page.page < page.totalPages ? <Link href={`/dashboard/messages?filter=${filter}&page=${page.page + 1}`} className="text-cool underline">Older →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
