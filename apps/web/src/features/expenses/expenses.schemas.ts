import { z } from 'zod';

export const expenseCategorySchema = z.enum([
  'food',
  'travel',
  'rent',
  'shopping',
  'entertainment',
  'education',
  'other',
]);

export const expenseSplitTypeSchema = z.enum(['equal', 'exact', 'percentage']);

export const participantSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().positive(),
  percentage: z.number().min(0).max(100).optional(),
});

export const createExpenseSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  amount: z.coerce.number().positive(),
  category: expenseCategorySchema,
  note: z.string().trim().max(300).optional(),
  paidBy: z.string().min(1),
  participants: z.array(participantSchema).min(1),
  splitType: expenseSplitTypeSchema,
});

export const updateExpenseSchema = createExpenseSchema.omit({ groupId: true });
