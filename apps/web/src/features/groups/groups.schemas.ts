import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().trim().min(3, 'Group name is required.').max(100),
  type: z.enum(['trip', 'home', 'party', 'office', 'food']),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().trim().length(6, 'Invite code must be 6 characters.').transform((value) => value.toUpperCase()),
});
