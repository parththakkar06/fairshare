import { randomBytes } from 'node:crypto';

import { AppError } from '../../common/errors/app-error.js';
import type { GroupRepository } from './group.repository.js';
import type { GroupDocument, GroupMember, GroupType } from './group.types.js';
import type { ExpenseRepository } from '../expense/expense.repository.js';
import type { SettlementRepository } from '../settlement/settlement.repository.js';
import type { GroupMutex } from '../../common/utils/group-mutex.js';
import { calculateBalances } from '../../common/utils/balances.js';

interface CreateGroupInput {
  name: string;
  type: GroupType;
  createdBy: string;
  creator: GroupMember;
}

export class GroupService {
  constructor(
    private readonly repository: GroupRepository,
    private readonly expenseRepository?: ExpenseRepository,
    private readonly settlementRepository?: SettlementRepository,
    private readonly groupMutex?: GroupMutex,
  ) {}

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

    const run = async () => {
      const latestGroup = await this.repository.findById(group.id);
      if (!latestGroup) {
        throw new AppError(404, 'GROUP_NOT_FOUND', 'This invite code does not match any group.');
      }
      if (latestGroup.members.some((existing) => existing.userId === member.userId)) {
        return latestGroup;
      }
      return this.repository.addMember(latestGroup.id, member);
    };

    if (this.groupMutex) {
      const release = await this.groupMutex.acquire(group.id);
      try {
        return await run();
      } finally {
        release();
      }
    } else {
      return run();
    }
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

  async leaveGroup(groupId: string, userId: string): Promise<GroupDocument> {
    const run = async () => {
      const group = await this.repository.findById(groupId);
      if (!group) {
        throw new AppError(404, 'GROUP_NOT_FOUND', 'Group not found.');
      }

      if (!group.members.some((member) => member.userId === userId)) {
        throw new AppError(400, 'NOT_A_MEMBER', 'You are not a member of this group.');
      }

      if (group.createdBy === userId) {
        throw new AppError(
          400,
          'OWNER_CANNOT_LEAVE',
          'The group owner cannot leave the group. Delete the group instead.',
        );
      }

      if (this.expenseRepository && this.settlementRepository) {
        const [expenses, settlements] = await Promise.all([
          this.expenseRepository.findByGroupId(groupId),
          this.settlementRepository.findByGroupId(groupId),
        ]);
        const balances = calculateBalances(
          group.members.map((m) => m.userId),
          expenses,
          settlements,
        );
        const userBalance = balances.get(userId) ?? 0;
        if (Math.round(Math.abs(userBalance) * 100) !== 0) {
          throw new AppError(
            400,
            'OUTSTANDING_BALANCE',
            'You cannot leave the group because you have an outstanding balance (debt or credit).',
          );
        }
      }

      const updated = await this.repository.removeMember(groupId, userId);
      if (!updated) {
        throw new AppError(404, 'GROUP_NOT_FOUND', 'Group not found.');
      }
      return updated;
    };

    if (this.groupMutex) {
      const release = await this.groupMutex.acquire(groupId);
      try {
        return await run();
      } finally {
        release();
      }
    } else {
      return run();
    }
  }

  async removeMember(groupId: string, ownerId: string, memberId: string): Promise<GroupDocument> {
    const run = async () => {
      const group = await this.repository.findById(groupId);
      if (!group) {
        throw new AppError(404, 'GROUP_NOT_FOUND', 'Group not found.');
      }

      if (group.createdBy !== ownerId) {
        throw new AppError(403, 'FORBIDDEN', 'Only the group owner can remove members.');
      }

      if (!group.members.some((member) => member.userId === memberId)) {
        throw new AppError(400, 'NOT_A_MEMBER', 'The user is not a member of this group.');
      }

      if (memberId === ownerId) {
        throw new AppError(400, 'CANNOT_REMOVE_OWNER', 'The group owner cannot be removed.');
      }

      if (this.expenseRepository && this.settlementRepository) {
        const [expenses, settlements] = await Promise.all([
          this.expenseRepository.findByGroupId(groupId),
          this.settlementRepository.findByGroupId(groupId),
        ]);
        const balances = calculateBalances(
          group.members.map((m) => m.userId),
          expenses,
          settlements,
        );
        const memberBalance = balances.get(memberId) ?? 0;
        if (Math.round(Math.abs(memberBalance) * 100) !== 0) {
          throw new AppError(
            400,
            'OUTSTANDING_BALANCE',
            'The member cannot be removed because they have an outstanding balance (debt or credit).',
          );
        }
      }

      const updated = await this.repository.removeMember(groupId, memberId);
      if (!updated) {
        throw new AppError(404, 'GROUP_NOT_FOUND', 'Group not found.');
      }
      return updated;
    };

    if (this.groupMutex) {
      const release = await this.groupMutex.acquire(groupId);
      try {
        return await run();
      } finally {
        release();
      }
    } else {
      return run();
    }
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const run = async () => {
      const group = await this.repository.findById(groupId);
      if (!group) {
        throw new AppError(404, 'GROUP_NOT_FOUND', 'Group not found.');
      }

      if (group.createdBy !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Only the group owner can delete this group.');
      }

      await this.repository.deleteById(groupId);

      if (this.expenseRepository) {
        await this.expenseRepository.deleteByGroupId(groupId);
      }
      if (this.settlementRepository) {
        await this.settlementRepository.deleteByGroupId(groupId);
      }
    };

    if (this.groupMutex) {
      const release = await this.groupMutex.acquire(groupId);
      try {
        await run();
      } finally {
        release();
      }
    } else {
      await run();
    }
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

