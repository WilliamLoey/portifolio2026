'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ContactFields, contactFieldsSchema, Locale } from '@portfolio/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { publicEnv } from '@/lib/env.public';

type Status = 'idle' | 'success' | 'error' | 'rateLimited';

/**
 * Validated in the browser with the same Zod schema the API uses (messages are translation keys),
 * then validated again by the API. Posts straight to the API so rate limits see the visitor's IP.
 */
export function ContactForm() {
  const t = useTranslations('contact');
  const locale = useLocale() as Locale;
  const startedAt = useRef(Date.now());
  const [status, setStatus] = useState<Status>('idle');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFields>({ resolver: zodResolver(contactFieldsSchema), mode: 'onTouched' });

  const onSubmit = handleSubmit(async (fields, event) => {
    const website = (event?.target as HTMLFormElement | undefined)?.querySelector<HTMLInputElement>('[name="website"]')?.value;
    try {
      const response = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...fields, locale, website, startedAt: startedAt.current }),
      });
      setStatus(response.ok ? 'success' : response.status === 429 ? 'rateLimited' : 'error');
      if (response.ok) reset();
    } catch {
      setStatus('error');
    }
  });

  if (status === 'success') {
    return (
      <div role="status" className="flex flex-col items-start gap-4 border border-line bg-surface p-6">
        <p className="text-lg">{t('success')}</p>
        <button type="button" onClick={() => { startedAt.current = Date.now(); setStatus('idle'); }} className="cursor-pointer font-mono text-xs text-cool underline underline-offset-4">
          {t('another')}
        </button>
      </div>
    );
  }

  const fieldError = (name: keyof ContactFields) => {
    const message = errors[name]?.message;
    return message ? t(`errors.${message}` as 'errors.name.min') : undefined;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-describedby={status !== 'idle' ? 'contact-status' : undefined}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label={t('name')} error={fieldError('name')}>
          <input id="contact-name" autoComplete="name" {...register('name')} {...invalid(fieldError('name'), 'contact-name')} className={inputClass} />
        </Field>
        <Field id="contact-email" label={t('email')} error={fieldError('email')}>
          <input id="contact-email" type="email" autoComplete="email" {...register('email')} {...invalid(fieldError('email'), 'contact-email')} className={inputClass} />
        </Field>
      </div>
      <Field id="contact-subject" label={t('subject')} error={fieldError('subject')}>
        <input id="contact-subject" {...register('subject')} {...invalid(fieldError('subject'), 'contact-subject')} className={inputClass} />
      </Field>
      <Field id="contact-message" label={t('message')} error={fieldError('message')}>
        <textarea id="contact-message" rows={6} {...register('message')} {...invalid(fieldError('message'), 'contact-message')} className={`${inputClass} resize-y`} />
      </Field>

      {/* Honeypot: off-screen for people, tempting for bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">{t('honeypot')}</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer border border-fg bg-fg px-6 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-85 disabled:cursor-progress disabled:opacity-60"
        >
          {isSubmitting ? t('sending') : t('send')}
        </button>
        {(status === 'error' || status === 'rateLimited') && (
          <p id="contact-status" role="alert" className="text-sm text-danger">
            {status === 'rateLimited' ? t('rateLimited') : t('error')}
          </p>
        )}
      </div>
    </form>
  );
}

const inputClass =
  'w-full border border-line bg-surface px-3.5 py-2.5 text-base text-fg placeholder:text-faint transition-colors hover:border-line-strong focus:border-cool focus:outline-none aria-[invalid=true]:border-danger';

const invalid = (error: string | undefined, id: string) =>
  error ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {};

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}
