import { z } from 'zod';

// NEXT_PUBLIC_* values are inlined at build time, so they must be referenced explicitly.
const schema = z.object({
  NEXT_PUBLIC_API_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
  NEXT_PUBLIC_SITE_URL: z
    .url({ protocol: /^https?$/ })
    .default('http://localhost:3000')
    .transform((url) => url.replace(/\/+$/, '')),
});

export const publicEnv = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
});
