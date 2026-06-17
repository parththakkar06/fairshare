import { AppError } from '../../common/errors/app-error.js';
import type { GroupDocument } from '../group/group.types.js';
import type { GroupService } from '../group/group.service.js';
import type { ExpenseRepository } from './expense.repository.js';
import type { CreateExpenseInput, ExpenseDocument, UpdateExpenseInput } from './expense.types.js';
import type { GroupMutex } from '../../common/utils/group-mutex.js';

const MONEY_TOLERANCE_CENTS = 1;
const PERCENTAGE_TOLERANCE = 0.01;

export class ExpenseService {
  constructor(
    private readonly repository: ExpenseRepository,
    private readonly groupService: GroupService,
    private readonly groupMutex?: GroupMutex,
  ) {}

  async createExpense(userId: string, input: CreateExpenseInput): Promise<ExpenseDocument> {
    const run = async () => {
      const group = await this.groupService.getGroupForMember(input.groupId, userId);
      validateExpenseInput(group, input);
      return this.repository.create(input);
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

  async getExpenseById(expenseId: string, userId: string): Promise<ExpenseDocument> {
    const expense = await this.repository.findById(expenseId);
    if (!expense) {
      throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found.');
    }
    await this.groupService.getGroupForMember(expense.groupId, userId);
    return expense;
  }

  async getExpensesByGroup(groupId: string, userId: string): Promise<ExpenseDocument[]> {
    await this.groupService.getGroupForMember(groupId, userId);
    return this.repository.findByGroupId(groupId);
  }

  async updateExpense(
    expenseId: string,
    userId: string,
    input: UpdateExpenseInput,
  ): Promise<ExpenseDocument> {
    const existing = await this.repository.findById(expenseId);
    if (!existing) {
      throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found.');
    }

    const run = async () => {
      const group = await this.groupService.getGroupForMember(existing.groupId, userId);
      const activeUserIds = new Set(group.members.map((m) => m.userId));
      if (!activeUserIds.has(existing.paidBy)) {
        throw new AppError(
          400,
          'HISTORICAL_MEMBER_LOCKED',
          'This expense involves a former member who has left the group and cannot be modified.',
        );
      }
      for (const participant of existing.participants) {
        if (!activeUserIds.has(participant.userId)) {
          throw new AppError(
            400,
            'HISTORICAL_MEMBER_LOCKED',
            'This expense involves a former member who has left the group and cannot be modified.',
          );
        }
      }

      validateExpenseInput(group, { ...input, groupId: existing.groupId });
      return this.repository.update(expenseId, input);
    };

    if (this.groupMutex) {
      const release = await this.groupMutex.acquire(existing.groupId);
      try {
        return await run();
      } finally {
        release();
      }
    } else {
      return run();
    }
  }

  async deleteExpense(expenseId: string, userId: string): Promise<void> {
    const expense = await this.repository.findById(expenseId);
    if (!expense) {
      throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found.');
    }

    const run = async () => {
      const group = await this.groupService.getGroupForMember(expense.groupId, userId);
      const activeUserIds = new Set(group.members.map((m) => m.userId));
      if (!activeUserIds.has(expense.paidBy)) {
        throw new AppError(
          400,
          'HISTORICAL_MEMBER_LOCKED',
          'This expense involves a former member who has left the group and cannot be deleted.',
        );
      }
      for (const participant of expense.participants) {
        if (!activeUserIds.has(participant.userId)) {
          throw new AppError(
            400,
            'HISTORICAL_MEMBER_LOCKED',
            'This expense involves a former member who has left the group and cannot be deleted.',
          );
        }
      }

      await this.repository.deleteById(expenseId);
    };

    if (this.groupMutex) {
      const release = await this.groupMutex.acquire(expense.groupId);
      try {
        await run();
      } finally {
        release();
      }
    } else {
      await run();
    }
  }
}

function validateExpenseInput(
  group: GroupDocument,
  input: CreateExpenseInput | UpdateExpenseInput,
): void {
  if (!group.members.some((member) => member.userId === input.paidBy)) {
    throw new AppError(400, 'INVALID_PAYER', 'The payer must be a member of the selected group.');
  }

  const participantIds = input.participants.map((participant) => participant.userId);
  const uniqueParticipantIds = new Set(participantIds);
  if (uniqueParticipantIds.size !== participantIds.length) {
    throw new AppError(400, 'DUPLICATE_PARTICIPANTS', 'Duplicate participants are not allowed.');
  }

  const invalidParticipant = participantIds.find(
    (userId) => !group.members.some((member) => member.userId === userId),
  );
  if (invalidParticipant) {
    throw new AppError(
      400,
      'INVALID_PARTICIPANT',
      'All participants must be members of the selected group.',
    );
  }

  const expectedAmount = toCents(input.amount);
  const participantTotal = input.participants.reduce(
    (sum, participant) => sum + toCents(participant.amount),
    0,
  );
  if (Math.abs(participantTotal - expectedAmount) > MONEY_TOLERANCE_CENTS) {
    throw new AppError(
      400,
      'INVALID_SPLIT',
      'Participant amounts must add up to the expense amount.',
    );
  }

  if (input.splitType === 'equal') {
    const avgCents = expectedAmount / input.participants.length;
    for (const participant of input.participants) {
      const pCents = toCents(participant.amount);
      if (Math.abs(pCents - avgCents) > MONEY_TOLERANCE_CENTS) {
        throw new AppError(
          400,
          'INVALID_SPLIT',
          'For equal split, each participant amount must be equal (within 1 cent rounding).',
        );
      }
    }
  }

  if (input.splitType === 'percentage') {
    const percentageTotal = input.participants.reduce(
      (sum, participant) => sum + (participant.percentage ?? 0),
      0,
    );
    const missingPercentage = input.participants.some(
      (participant) => participant.percentage === undefined,
    );

    if (missingPercentage || Math.abs(percentageTotal - 100) > PERCENTAGE_TOLERANCE) {
      throw new AppError(400, 'INVALID_SPLIT', 'Participant percentages must add up to 100.');
    }

    for (const participant of input.participants) {
      const expectedPShare = ((participant.percentage ?? 0) / 100) * expectedAmount;
      const pCents = toCents(participant.amount);
      if (Math.abs(pCents - expectedPShare) > MONEY_TOLERANCE_CENTS) {
        throw new AppError(
          400,
          'INVALID_SPLIT',
          `Participant amount for ${participant.userId} does not match their percentage split.`,
        );
      }
    }
  }
}

function toCents(value: number): number {
  return Math.round(value * 100);
}
