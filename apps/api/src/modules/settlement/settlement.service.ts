import { AppError } from '../../common/errors/app-error.js';
import type { GroupService } from '../group/group.service.js';
import type { SettlementRepository } from './settlement.repository.js';
import type { CreateSettlementInput, SettlementDocument } from './settlement.types.js';
import type { ExpenseRepository } from '../expense/expense.repository.js';
import type { GroupMutex } from '../../common/utils/group-mutex.js';
import { calculateBalances } from '../../common/utils/balances.js';


export class SettlementService {
  constructor(
    private readonly repository: SettlementRepository,
    private readonly groupService: GroupService,
    private readonly expenseRepository?: ExpenseRepository,
    private readonly groupMutex?: GroupMutex,
  ) {}

  async createSettlement(fromUserId: string, input: Omit<CreateSettlementInput, 'fromUserId'>): Promise<SettlementDocument> {
    if (input.amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Settlement amount must be greater than zero.');
    }

    if (fromUserId === input.toUserId) {
      throw new AppError(400, 'INVALID_RECIPIENT', 'You cannot settle with yourself.');
    }

    const run = async () => {
      const group = await this.groupService.getGroupById(input.groupId);

      if (!group.members.some((member) => member.userId === fromUserId)) {
        throw new AppError(403, 'FORBIDDEN', 'You must be a member of this group to record a settlement.');
      }

      if (!group.members.some((member) => member.userId === input.toUserId)) {
        throw new AppError(400, 'INVALID_RECIPIENT', 'The recipient must be a member of the selected group.');
      }

      // Check outstanding debt limits if expenseRepository is available
      if (this.expenseRepository) {
        const [expenses, settlements] = await Promise.all([
          this.expenseRepository.findByGroupId(input.groupId),
          this.repository.findByGroupId(input.groupId),
        ]);

        const balances = calculateBalances(
          group.members.map((m) => m.userId),
          expenses,
          settlements,
        );

        const payerBalance = balances.get(fromUserId) ?? 0;
        const receiverBalance = balances.get(input.toUserId) ?? 0;

        if (payerBalance >= -0.005) {
          throw new AppError(400, 'INVALID_SETTLEMENT', 'Payer does not owe any money in this group.');
        }

        if (receiverBalance <= 0.005) {
          throw new AppError(400, 'INVALID_SETTLEMENT', 'Receiver is not owed any money in this group.');
        }

        const maxAllowed = Math.min(Math.abs(payerBalance), receiverBalance);
        if (Math.round(input.amount * 100) > Math.round(maxAllowed * 100)) {
          throw new AppError(
            400,
            'INVALID_SETTLEMENT',
            `Settlement amount of ₹${input.amount.toFixed(2)} exceeds the outstanding debt of ₹${maxAllowed.toFixed(2)}.`,
          );
        }
      }

      return this.repository.create({
        ...input,
        fromUserId,
        note: input.note?.trim() ?? '',
      });
    };

    if (this.groupMutex) {
      const release = await this.groupMutex.acquire(input.groupId);
      try {
        return await run();
      } finally {
        release();
      }
    } else {
      return run();
    }
  }

  async getSettlementsByGroup(groupId: string): Promise<SettlementDocument[]> {
    await this.groupService.getGroupById(groupId);
    return this.repository.findByGroupId(groupId);
  }
}
