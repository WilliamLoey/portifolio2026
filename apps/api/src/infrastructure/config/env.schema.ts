import { z } from 'zod';

const booleanString = (fallback: 'true' | 'false') =>
  z.enum(['true', 'false']).default(fallback).transform((v) => v === 'true');

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url({ protocol: /^https?$/ }).optional());
const secret = (name: string) =>
  z.string().min(32, `${name} must be at least 32 characters (openssl rand -base64 48)`);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    /** Public origin of this API: image URLs (local storage) and the OpenAPI server URL. */
    PUBLIC_API_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
    /** Browser origins allowed by CORS (only the contact form calls the API from a browser). */
    CORS_ORIGINS: z
      .string()
      .min(1)
      .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
      .pipe(z.array(z.url({ protocol: /^https?$/ })).min(1)),
    /** Number of proxies in front of the API (1 on Vercel), so req.ip is the visitor's IP. */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a PostgreSQL connection string'),
    /** Connections per instance. Keep it small on serverless (Neon's pooler does the rest); 1 for PGlite. */
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),

    /** Admin sessions last this long without activity limits (default 7 days). */
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(168),
    /** Salt for hashing visitor IPs (rate limiting, abuse checks). IPs are never stored in clear. */
    IP_HASH_SALT: secret('IP_HASH_SALT'),

    STORAGE_DRIVER: z.enum(['local', 'vercel-blob', 'cloudinary']).default('local'),
    STORAGE_FOLDER: z.string().min(1).default('portfolio'),
    UPLOAD_DIR: z.string().min(1).default('uploads'),
    /** Vercel Functions accept request bodies up to 4.5 MB; the dashboard resizes images before upload. */
    MAX_UPLOAD_MB: z.coerce.number().positive().max(20).default(4),
    BLOB_READ_WRITE_TOKEN: optionalString,
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,

    /** smtp (Mailpit locally, Gmail…), resend (production), log (prints emails; dev only). */
    MAIL_DRIVER: z.enum(['smtp', 'resend', 'log']).default('log'),
    MAIL_FROM: z.string().min(3),
    /** Where contact-form messages are delivered. */
    MAIL_TO: z.email(),
    RESEND_API_KEY: optionalString,
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(465),
    SMTP_SECURE: booleanString('true'),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,

    /** Website route that rebuilds cached pages after a publish. Optional in development. */
    WEB_REVALIDATE_URL: optionalUrl,
    REVALIDATE_SECRET: z.preprocess(emptyToUndefined, secret('REVALIDATE_SECRET').optional()),

    /** Set automatically by Vercel. */
    VERCEL: optionalString,
  })
  .superRefine((env, ctx) => {
    const require = (key: keyof typeof env, because: string) => {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: `required ${because}` });
    };

    if (env.STORAGE_DRIVER === 'cloudinary') {
      for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const) {
        require(key, 'when STORAGE_DRIVER=cloudinary');
      }
    }
    if (env.STORAGE_DRIVER === 'vercel-blob') require('BLOB_READ_WRITE_TOKEN', 'when STORAGE_DRIVER=vercel-blob');
    if (env.VERCEL && env.STORAGE_DRIVER === 'local') {
      ctx.addIssue({ code: 'custom', path: ['STORAGE_DRIVER'], message: 'Vercel has no persistent disk: use "vercel-blob" or "cloudinary"' });
    }

    if (env.MAIL_DRIVER === 'resend') require('RESEND_API_KEY', 'when MAIL_DRIVER=resend');
    if (env.MAIL_DRIVER === 'smtp') require('SMTP_HOST', 'when MAIL_DRIVER=smtp');
    if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASS)) {
      ctx.addIssue({ code: 'custom', path: ['SMTP_PASS'], message: 'SMTP_USER and SMTP_PASS must be set together' });
    }

    if (Boolean(env.WEB_REVALIDATE_URL) !== Boolean(env.REVALIDATE_SECRET)) {
      ctx.addIssue({ code: 'custom', path: ['REVALIDATE_SECRET'], message: 'WEB_REVALIDATE_URL and REVALIDATE_SECRET must be set together' });
    }

    if (env.NODE_ENV === 'production') {
      if (env.MAIL_DRIVER === 'log') {
        ctx.addIssue({ code: 'custom', path: ['MAIL_DRIVER'], message: 'use "smtp" or "resend" in production, or contact emails are lost' });
      }
      require('WEB_REVALIDATE_URL', 'in production, or published changes take up to an hour to appear');
      if (/change-me/i.test(env.IP_HASH_SALT)) {
        ctx.addIssue({ code: 'custom', path: ['IP_HASH_SALT'], message: 'replace the example value before deploying' });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule: the app refuses to boot with a clear list of what is wrong. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return result.data;
}
