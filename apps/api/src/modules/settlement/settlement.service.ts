import { AppError } from '../../common/errors/app-error.js';
import type { GroupService } from '../group/group.service.js';
import type { SettlementRepository } from './settlement.repository.js';
import type { CreateSettlementInput, SettlementDocument } from './settlement.types.js';

export class SettlementService {
  constructor(
    private readonly repository: SettlementRepository,
    private readonly groupService: GroupService,
  ) {}

  async createSettlement(fromUserId: string, input: Omit<CreateSettlementInput, 'fromUserId'>): Promise<SettlementDocument> {
    if (input.amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Settlement amount must be greater than zero.');
    }

    if (fromUserId === input.toUserId) {
      throw new AppError(400, 'INVALID_RECIPIENT', 'You cannot settle with yourself.');
    }

    const group = await this.groupService.getGroupById(input.groupId);

    if (!group.members.some((member) => member.userId === fromUserId)) {
      throw new AppError(403, 'FORBIDDEN', 'You must be a member of this group to record a settlement.');
    }

    if (!group.members.some((member) => member.userId === input.toUserId)) {
      throw new AppError(400, 'INVALID_RECIPIENT', 'The recipient must be a member of the selected group.');
    }

    return this.repository.create({
      ...input,
      fromUserId,
      note: input.note?.trim() ?? '',
    });
  }

  async getSettlementsByGroup(groupId: string): Promise<SettlementDocument[]> {
    await this.groupService.getGroupById(groupId);
    return this.repository.findByGroupId(groupId);
  }
}
