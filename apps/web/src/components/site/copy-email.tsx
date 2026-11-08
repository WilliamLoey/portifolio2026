'use client';

import { useState } from 'react';

export function CopyEmail({ email, labels }: { email: string; labels: { copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address is still visible and selectable.
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <a href={`mailto:${email}`} className="font-display text-xl font-semibold underline decoration-warm decoration-2 underline-offset-[6px] hover:decoration-fg">
        {email}
      </a>
      <button type="button" onClick={copy} className="cursor-pointer border border-line px-2 py-1 font-mono text-2xs text-muted hover:text-fg" aria-live="polite">
        {copied ? labels.copied : labels.copy}
      </button>
    </span>
  );
}
