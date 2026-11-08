'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { type FieldValues, type Resolver, useForm, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { adminRequest, ApiRequestError } from '@/lib/admin-client';
import { applyServerErrors } from './form-helpers';
import { Button, ConfirmButton, EmptyState, Panel, useToast } from './ui';

/**
 * Inline list editor for small reference collections (technologies, categories,
 * certifications, links): add, edit in place, reorder, delete with confirmation.
 * Changes apply to the site immediately; there is no draft for reference data.
 */
export function CollectionManager<T extends { id: string }, F extends FieldValues>({
  title,
  description,
  noun,
  basePath,
  initial,
  schema,
  toForm,
  empty,
  renderRow,
  renderForm,
  reorderable = true,
  deleteWarning,
}: {
  title: string;
  description?: ReactNode;
  noun: string;
  basePath: string;
  initial: T[];
  schema: z.ZodType;
  toForm: (item: T) => F;
  empty: F;
  renderRow: (item: T) => ReactNode;
  renderForm: (form: UseFormReturn<F>, idPrefix: string) => ReactNode;
  reorderable?: boolean;
  deleteWarning?: (item: T) => ReactNode;
}) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function move(index: number, delta: -1 | 1) {
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved!);
    const previous = items;
    setItems(next);
    try {
      await adminRequest('PUT', `${basePath}/order`, { ids: next.map((i) => i.id) });
    } catch (error) {
      setItems(previous);
      toast(error instanceof ApiRequestError ? error.message : 'Could not reorder', 'error');
    }
  }

  async function remove(item: T) {
    try {
      await adminRequest('DELETE', `${basePath}/${item.id}`);
      setItems((list) => list.filter((i) => i.id !== item.id));
      toast(`${noun} deleted`);
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not delete', 'error');
    }
  }

  function saved(item: T, created: boolean) {
    setItems((list) => (created ? [...list, item] : list.map((i) => (i.id === item.id ? item : i))));
    setEditing(null);
    toast(created ? `${noun} added` : `${noun} saved`);
    router.refresh();
  }

  return (
    <Panel
      title={title}
      description={description}
      actions={editing !== 'new' && <Button size="sm" variant="primary" onClick={() => setEditing('new')}>Add {noun.toLowerCase()}</Button>}
    >
      {editing === 'new' && (
        <ItemForm<T, F> basePath={basePath} schema={schema} defaults={empty} onCancel={() => setEditing(null)} onSaved={(i) => saved(i, true)} renderForm={renderForm} idPrefix="new" />
      )}
      {items.length === 0 && editing !== 'new' ? (
        <EmptyState title={`No ${noun.toLowerCase()}s yet`} />
      ) : (
        <ul className="border border-line">
          {items.map((item, index) => (
            <li key={item.id} className="border-b border-line last:border-0">
              {editing === item.id ? (
                <div className="p-4">
                  <ItemForm<T, F> basePath={basePath} id={item.id} schema={schema} defaults={toForm(item)} onCancel={() => setEditing(null)} onSaved={(i) => saved(i, false)} renderForm={renderForm} idPrefix={item.id} />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  {reorderable && (
                    <div className="flex gap-1">
                      <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up" className="grid size-7 cursor-pointer place-items-center border border-line text-xs disabled:opacity-30">↑</button>
                      <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down" className="grid size-7 cursor-pointer place-items-center border border-line text-xs disabled:opacity-30">↓</button>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">{renderRow(item)}</div>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(item.id)}>Edit</Button>
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    title={`Delete this ${noun.toLowerCase()}?`}
                    description={deleteWarning?.(item) ?? 'This change applies to the site immediately.'}
                    confirmLabel="Delete"
                    onConfirm={() => remove(item)}
                  >
                    Delete
                  </ConfirmButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ItemForm<T extends { id: string }, F extends FieldValues>({
  basePath,
  id,
  schema,
  defaults,
  onCancel,
  onSaved,
  renderForm,
  idPrefix,
}: {
  basePath: string;
  id?: string;
  schema: z.ZodType;
  defaults: F;
  onCancel: () => void;
  onSaved: (item: T) => void;
  renderForm: (form: UseFormReturn<F>, idPrefix: string) => ReactNode;
  idPrefix: string;
}) {
  const toast = useToast();
  const form = useForm<F>({ resolver: zodResolver(schema as never) as unknown as Resolver<F>, defaultValues: defaults as never });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const item = id ? await adminRequest<T>('PUT', `${basePath}/${id}`, values) : await adminRequest<T>('POST', basePath, values);
      onSaved(item);
    } catch (error) {
      if (error instanceof ApiRequestError) applyServerErrors(error, form.setError);
      toast(error instanceof ApiRequestError ? error.message : 'Could not save', 'error');
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 border border-cool/40 bg-bg p-4">
      {renderForm(form, idPrefix)}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" busy={form.formState.isSubmitting}>Save</Button>
      </div>
    </form>
  );
}
