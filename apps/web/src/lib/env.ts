import { z } from 'zod';

const webEnvSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
});

export const webEnv = webEnvSchema.parse(import.meta.env);
