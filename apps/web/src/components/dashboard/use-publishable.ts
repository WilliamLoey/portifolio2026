'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { adminRequest, ApiRequestError } from '@/lib/admin-client';
import { applyServerErrors } from './form-helpers';
import { useToast } from './ui';

/**
 * Save / publish / unpublish / delete for an item under `basePath` (e.g. "/experience").
 * Shared by the experience and education editors.
 */
export function usePublishable<TForm extends FieldValues, TOut, TItem extends { id: string }>(options: {
  basePath: string;
  dashboardPath: string;
  initial?: TItem;
  form: UseFormReturn<TForm, unknown, TOut>;
  toForm: (item: TItem) => TForm;
}) {
  const { basePath, dashboardPath, form, toForm } = options;
  const router = useRouter();
  const toast = useToast();
  const [item, setItem] = useState(options.initial);
  const [busy, setBusy] = useState<'publish' | 'unpublish' | null>(null);

  async function save(values: TOut): Promise<TItem | null> {
    try {
      const saved = item
        ? await adminRequest<TItem>('PUT', `${basePath}/${item.id}`, values)
        : await adminRequest<TItem>('POST', basePath, values);
      setItem(saved);
      form.reset(toForm(saved));
      if (!item) router.replace(`${dashboardPath}/${saved.id}`);
      return saved;
    } catch (error) {
      if (error instanceof ApiRequestError) applyServerErrors(error, form.setError);
      toast(error instanceof ApiRequestError ? error.message : 'Could not save', 'error');
      return null;
    }
  }

  const onSave = form.handleSubmit(async (v) => { if (await save(v)) toast('Draft saved'); }, () => toast('Some fields need attention', 'error'));

  const publish = form.handleSubmit(async (v) => {
    const saved = form.formState.isDirty || !item ? await save(v) : item;
    if (!saved) return;
    setBusy('publish');
    try {
      setItem(await adminRequest<TItem>('POST', `${basePath}/${saved.id}/publish`));
      toast('Published');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not publish', 'error');
    } finally {
      setBusy(null);
    }
  }, () => toast('Fix the highlighted fields first', 'error'));

  async function unpublish() {
    if (!item) return;
    setBusy('unpublish');
    try {
      setItem(await adminRequest<TItem>('POST', `${basePath}/${item.id}/unpublish`));
      toast('Unpublished');
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not unpublish', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!item) return;
    try {
      await adminRequest('DELETE', `${basePath}/${item.id}`);
      form.reset(form.getValues());
      toast('Deleted');
      router.replace(dashboardPath);
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not delete', 'error');
    }
  }

  return { item, busy, onSave, publish, unpublish, remove };
}
