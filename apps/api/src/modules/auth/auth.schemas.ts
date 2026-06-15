import { z } from 'zod';

const emailSchema = z.string().trim().email('Enter a valid email address.').max(254);
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
