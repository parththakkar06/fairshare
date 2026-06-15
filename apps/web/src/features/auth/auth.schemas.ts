import { z } from 'zod';

const email = z.string().trim().email('Enter a valid email address.').max(254);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.').max(72),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
