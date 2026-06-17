import { AppError } from '../../common/errors/app-error.js';
import type { ExpenseDocument } from '../expense/expense.types.js';
import type { ExpenseRepository } from '../expense/expense.repository.js';
import type { SettlementRepository } from '../settlement/settlement.repository.js';
import type { GroupRepository } from '../group/group.repository.js';
import type { SettlementDocument } from '../settlement/settlement.types.js';
import type { MemberBalance, SettlementSuggestion, GroupBalance } from './balance.types.js';

export class BalanceService {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly settlementRepository: SettlementRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  async getGroupBalance(groupId: string, userId: string): Promise<GroupBalance> {
    const [group, expenses, settlements] = await Promise.all([
      this.groupRepository.findById(groupId),
      this.expenseRepository.findByGroupId(groupId),
      this.settlementRepository.findByGroupId(groupId),
    ]);

    if (!group) {
      throw new AppError(404, 'GROUP_NOT_FOUND', 'Group not found.');
    }

    if (!group.members.some((member) => member.userId === userId)) {
      throw new AppError(403, 'FORBIDDEN', 'You must be a member of this group.');
    }

    const memberBalances = this.calculateMemberBalances(
      group.members.map((member) => ({ userId: member.userId, name: member.name })),
      expenses,
      settlements,
    );
    const suggestions = this.generateSettlementSuggestions(memberBalances);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalSettled = settlements.reduce((sum, settlement) => sum + settlement.amount, 0);

    return {
      groupId,
      groupName: group.name,
      members: memberBalances,
      suggestions,
      history: settlements.map((settlement) => ({
        id: settlement.id,
        fromUserId: settlement.fromUserId,
        toUserId: settlement.toUserId,
        amount: settlement.amount,
        note: settlement.note,
        createdAt:
          settlement.createdAt instanceof Date
            ? settlement.createdAt.toISOString()
            : new Date(settlement.createdAt).toISOString(),
      })),
      totalExpenses,
      totalSettled,
    };
  }

  private calculateMemberBalances(
    members: Array<{ userId: string; name: string }>,
    expenses: ExpenseDocument[],
    settlements: SettlementDocument[],
  ): MemberBalance[] {
    const balances = new Map<string, { userId: string; name: string; balance: number; isCurrentMember: boolean }>();

    members.forEach((member) => {
      balances.set(member.userId, { userId: member.userId, name: member.name, balance: 0, isCurrentMember: true });
    });

    // Populate former members who have transactions
    expenses.forEach((expense) => {
      if (!balances.has(expense.paidBy)) {
        balances.set(expense.paidBy, { userId: expense.paidBy, name: 'Former Member', balance: 0, isCurrentMember: false });
      }
      expense.participants.forEach((participant) => {
        if (!balances.has(participant.userId)) {
          balances.set(participant.userId, { userId: participant.userId, name: 'Former Member', balance: 0, isCurrentMember: false });
        }
      });
    });

    settlements.forEach((settlement) => {
      if (!balances.has(settlement.fromUserId)) {
        balances.set(settlement.fromUserId, { userId: settlement.fromUserId, name: 'Former Member', balance: 0, isCurrentMember: false });
      }
      if (!balances.has(settlement.toUserId)) {
        balances.set(settlement.toUserId, { userId: settlement.toUserId, name: 'Former Member', balance: 0, isCurrentMember: false });
      }
    });

    expenses.forEach((expense) => {
      const paidByBalance = balances.get(expense.paidBy);
      if (paidByBalance) {
        paidByBalance.balance += expense.amount;
      }

      expense.participants.forEach((participant) => {
        const participantBalance = balances.get(participant.userId);
        if (participantBalance) {
          participantBalance.balance -= participant.amount;
        }
      });
    });

    settlements.forEach((settlement) => {
      const fromBalance = balances.get(settlement.fromUserId);
      const toBalance = balances.get(settlement.toUserId);

      if (fromBalance && toBalance) {
        fromBalance.balance += settlement.amount;
        toBalance.balance -= settlement.amount;
      }
    });

    return Array.from(balances.values())
      .filter((balance) => {
        // Always include current members; include former members only if they
        // have a non-zero cent-level residual balance so the global sum stays 0.
        return balance.isCurrentMember || Math.round(Math.abs(balance.balance) * 100) !== 0;
      })
      .map((balance) => ({
        userId: balance.userId,
        name: balance.name,
        balance: Math.round(balance.balance * 100) / 100,
        owesAmount: Math.max(0, Math.round(balance.balance * -100) / 100),
        isOwedAmount: Math.max(0, Math.round(balance.balance * 100) / 100),
        isCurrentMember: balance.isCurrentMember,
      }))
      .sort((left, right) => left.balance - right.balance);
  }

  private generateSettlementSuggestions(memberBalances: MemberBalance[]): SettlementSuggestion[] {
    const suggestions: SettlementSuggestion[] = [];
    // Only generate suggestions for current members — former members with residual
    // balances are visible in the member list but cannot be part of new settlements.
    const balances = memberBalances
      .filter((member) => member.isCurrentMember)
      .map((member) => ({ ...member }));

    const debtors = balances
      .filter((balance) => balance.balance < 0)
      .sort((left, right) => left.balance - right.balance);
    const creditors = balances
      .filter((balance) => balance.balance > 0)
      .sort((left, right) => right.balance - left.balance);

    let debtorIdx = 0;
    let creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx]!;
      const creditor = creditors[creditorIdx]!;

      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      if (amount > 0.01) {
        suggestions.push({
          fromUserId: debtor.userId,
          fromName: debtor.name,
          toUserId: creditor.userId,
          toName: creditor.name,
          amount: Math.round(amount * 100) / 100,
        });
      }

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) debtorIdx += 1;
      if (creditor.balance < 0.01) creditorIdx += 1;
    }

    return suggestions;
  }
}
