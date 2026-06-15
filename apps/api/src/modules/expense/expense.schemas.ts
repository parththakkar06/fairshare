import { z } from 'zod';

const categorySchema = z.enum([
  'food',
  'travel',
  'rent',
  'shopping',
  'entertainment',
  'education',
  'other',
]);

const splitTypeSchema = z.enum(['equal', 'exact', 'percentage']);

const participantSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().positive(),
  percentage: z.number().min(0).max(100).optional(),
});

export const createExpenseSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  amount: z.coerce.number().positive(),
  category: categorySchema,
  note: z.string().trim().max(300).optional().default(''),
  paidBy: z.string().min(1),
  participants: z.array(participantSchema).min(1),
  splitType: splitTypeSchema,
});

export const updateExpenseSchema = createExpenseSchema.omit({ groupId: true });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
