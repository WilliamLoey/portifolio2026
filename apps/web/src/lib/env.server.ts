import 'server-only';
import { z } from 'zod';

const schema = z.object({
  API_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
  /** Shared with the API: verifies that revalidation calls really come from it. */
  REVALIDATE_SECRET: z.string().min(32).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

let cached: z.output<typeof schema> | undefined;

/** Server-only configuration, validated on first use. */
export function serverEnv() {
  if (cached) return cached;
  const result = schema.safeParse({
    API_URL: process.env.API_URL,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET || undefined,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (!result.success) {
    const details = result.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid web environment variables:\n${details}`);
  }
  cached = result.data;
  return cached;
}
