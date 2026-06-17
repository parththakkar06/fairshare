import { z } from 'zod';

const webEnvSchema = z.object({
  VITE_API_URL: z.string().url(),
});

export const webEnv = webEnvSchema.parse(import.meta.env);
