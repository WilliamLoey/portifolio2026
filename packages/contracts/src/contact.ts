import { z } from 'zod';
import { DEFAULT_LOCALE, localeSchema } from './locales';

/**
 * Field rules shared by the form (React Hook Form resolver) and the API.
 * Messages are translation keys on the web side, see messages/<locale>.json → contact.errors.
 */
export const contactFieldsSchema = z.object({
  name: z.string().trim().min(2, 'name.min').max(100, 'name.max'),
  email: z.email('email.invalid').trim().max(200, 'email.max'),
  subject: z.string().trim().min(3, 'subject.min').max(150, 'subject.max'),
  message: z.string().trim().min(20, 'message.min').max(5000, 'message.max'),
});
export type ContactFields = z.output<typeof contactFieldsSchema>;

export const contactRequestSchema = contactFieldsSchema.extend({
  locale: localeSchema.catch(DEFAULT_LOCALE),
  /** Honeypot: hidden from people, filled by naive bots. */
  website: z.string().max(200).optional(),
  /** Epoch ms when the form was rendered. Submissions faster than a human can type are dropped. */
  startedAt: z.number().int().positive().optional(),
});
export type ContactRequest = z.output<typeof contactRequestSchema>;

export const contactResponseSchema = z.object({ ok: z.literal(true) });

export const contactMessageSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  subject: z.string(),
  message: z.string(),
  locale: localeSchema,
  delivered: z.boolean(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type ContactMessage = z.infer<typeof contactMessageSchema>;

export const messagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  filter: z.enum(['all', 'unread']).catch('all'),
});
export type MessagesQuery = z.output<typeof messagesQuerySchema>;

export const markReadSchema = z.object({ read: z.boolean() });
