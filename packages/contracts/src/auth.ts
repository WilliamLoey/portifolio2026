import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email').trim().toLowerCase().max(200),
  password: z.string().min(1, 'Enter your password').max(200),
});
export type LoginBody = z.output<typeof loginSchema>;

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

/** Returned once at login. The Next.js server keeps `token` in an httpOnly cookie. */
export const loginResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.iso.datetime(),
  user: adminUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const sessionSchema = z.object({
  user: adminUserSchema,
  expiresAt: z.iso.datetime(),
});
export type Session = z.infer<typeof sessionSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z
      .string()
      .min(12, 'Use at least 12 characters')
      .max(200),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Choose a password different from the current one',
    path: ['newPassword'],
  });
export type ChangePasswordBody = z.output<typeof changePasswordSchema>;
