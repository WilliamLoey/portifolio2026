'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoginBody, loginSchema } from '@portfolio/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, describedBy, Field, Input } from './ui';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get('expired') ? 'Your session has expired. Sign in again.' : null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginBody>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    }).catch(() => null);
    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? 'Could not reach the server.');
      return;
    }
    const next = params.get('next');
    router.replace(next?.startsWith('/dashboard') ? next : '/dashboard');
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field id="email" label="Email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" autoFocus {...register('email')} {...describedBy('email', errors.email?.message)} />
      </Field>
      <Field id="password" label="Password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} {...describedBy('password', errors.password?.message)} />
      </Field>
      {error && <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" busy={isSubmitting}>Sign in</Button>
    </form>
  );
}
