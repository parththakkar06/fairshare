import { z } from 'zod';

export const groupTypeSchema = z.enum(['trip', 'home', 'party', 'office', 'food']);

export const createGroupSchema = z.object({
  name: z.string().trim().min(3, 'Group name is required.').max(100),
  type: groupTypeSchema,
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(6, 'Invite code is required.').max(6),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
