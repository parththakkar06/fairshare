import { randomBytes } from 'node:crypto';

import { AppError } from '../../common/errors/app-error.js';
import type { GroupRepository } from './group.repository.js';
import type { GroupDocument, GroupMember, GroupType } from './group.types.js';

interface CreateGroupInput {
  name: string;
  type: GroupType;
  createdBy: string;
  creator: GroupMember;
}

export class GroupService {
  constructor(private readonly repository: GroupRepository) {}

  async createGroup(input: CreateGroupInput): Promise<GroupDocument> {
    const inviteCode = await this.generateUniqueInviteCode();
    return this.repository.create({
      name: input.name.trim(),
      type: input.type,
      inviteCode,
      createdBy: input.createdBy,
      members: [input.creator],
    });
  }

  async joinGroup(inviteCode: string, member: GroupMember): Promise<GroupDocument> {
    const group = await this.repository.findByInviteCode(inviteCode);
    if (!group) {
      throw new AppError(404, 'GROUP_NOT_FOUND', 'This invite code does not match any group.');
    }

    if (group.members.some((existing) => existing.userId === member.userId)) {
      return group;
    }

    return this.repository.addMember(group.id, member);
  }

  async getGroupsForUser(userId: string): Promise<GroupDocument[]> {
    return this.repository.findAllByMember(userId);
  }

  async getGroupById(groupId: string): Promise<GroupDocument> {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new AppError(404, 'GROUP_NOT_FOUND', 'Group not found.');
    }
    return group;
  }

  async getGroupForMember(groupId: string, userId: string): Promise<GroupDocument> {
    const group = await this.getGroupById(groupId);

    if (!group.members.some((member) => member.userId === userId)) {
      throw new AppError(403, 'FORBIDDEN', 'You must be a member of this group.');
    }

    return group;
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new AppError(404, 'GROUP_NOT_FOUND', 'Group not found.');
    }

    if (group.createdBy !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the group owner can delete this group.');
    }

    await this.repository.deleteById(groupId);
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomBytes(3).toString('hex').toUpperCase();
      const existing = await this.repository.findByInviteCode(code);
      if (!existing) return code;
    }

    throw new AppError(500, 'CODE_GENERATION_FAILED', 'Unable to create a unique invite code.');
  }
}
