import { z } from 'zod';

export const createSettlementBodySchema = z.object({
  groupId: z.string().min(1),
  toUserId: z.string().min(1),
  amount: z.number().positive().transform((val) => Math.round(val * 100) / 100),
  note: z.string().max(256).optional(),
});

export type CreateSettlementBody = z.infer<typeof createSettlementBodySchema>;
