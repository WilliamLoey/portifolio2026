import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiRequestError } from '@/lib/admin-client';

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Puts the API's field errors (same paths as the shared Zod schema) on the matching inputs. */
export function applyServerErrors<T extends FieldValues>(error: ApiRequestError, setError: UseFormSetError<T>) {
  for (const { path, message } of error.fieldErrors) {
    if (path) setError(path as Path<T>, { type: 'server', message });
  }
}
