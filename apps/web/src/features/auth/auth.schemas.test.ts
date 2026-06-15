import { loginSchema, registerSchema } from '@/features/auth/auth.schemas';

describe('auth form schemas', () => {
  it('rejects malformed login input', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: '' }).success).toBe(false);
  });

  it('requires matching registration passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Jeet',
      email: 'jeet@example.com',
      password: 'strong-password',
      confirmPassword: 'different-password',
    });

    expect(result.success).toBe(false);
  });
});
