'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordBody, changePasswordSchema } from '@portfolio/contracts';
import { useForm } from 'react-hook-form';
import { ApiRequestError } from "@/lib/admin-client";
import { Button, describedBy, Field, Input, useToast } from './ui';

export function PasswordForm() {
  const toast = useToast();
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ChangePasswordBody>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      // /auth routes are not under /admin, so call the proxy's sibling route.
      const response = await fetch('/api/auth/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new ApiRequestError(response.status, body?.message ?? 'Could not change the password');
      }
      reset();
      toast('Password changed. Other devices were signed out.');
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : 'Could not change the password';
      if (/current password/i.test(message)) setError('currentPassword', { message });
      else toast(message, 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <Field id="currentPassword" label="Current password" error={errors.currentPassword?.message}>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} {...describedBy('currentPassword', errors.currentPassword?.message)} />
      </Field>
      <Field id="newPassword" label="New password" hint="At least 12 characters. A passphrase works well." error={errors.newPassword?.message}>
        <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} {...describedBy('newPassword', errors.newPassword?.message, true)} />
      </Field>
      <Button type="submit" variant="primary" busy={isSubmitting} className="self-start">Change password</Button>
    </form>
  );
}
