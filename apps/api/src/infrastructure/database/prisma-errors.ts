import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors';

interface Messages {
  unique?: string;
  foreignKey?: string;
  notFound?: string;
}

/**
 * Turns database constraint violations into domain errors, so the API answers
 * 409 / 422 / 404 instead of 500 when two requests race or a reference vanished.
 */
export async function guard<T>(operation: () => Promise<T>, messages: Messages = {}): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictError(messages.unique ?? 'That value is already in use');
      if (error.code === 'P2003') {
        throw new ValidationError(messages.foreignKey ?? 'A referenced item no longer exists. Reload and try again.');
      }
      if (error.code === 'P2025') throw new NotFoundError(messages.notFound ?? 'Not found');
    }
    throw error;
  }
}

/** Prisma JSON columns: null must be written as DbNull to store SQL NULL. */
export function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

export const isPublished = { published: { not: Prisma.DbNull } } as const;
