import type { ExpenseRepository } from '../expense/expense.repository.js';
import type { ExpenseCategory, ExpenseDocument } from '../expense/expense.types.js';
import type { GroupRepository } from '../group/group.repository.js';
import type { SettlementRepository } from '../settlement/settlement.repository.js';
import type {
  DashboardActivity,
  DashboardCategoryBreakdownItem,
  DashboardData,
  DashboardLargestExpense,
  DashboardMostActiveGroup,
  DashboardMonthlySpendingItem,
} from './dashboard.types.js';

const expenseCategories: ExpenseCategory[] = [
  'food',
  'travel',
  'rent',
  'shopping',
  'entertainment',
  'education',
  'other',
];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toMonthKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export class DashboardService {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly expenseRepository: ExpenseRepository,
    private readonly settlementRepository: SettlementRepository,
  ) {}

  async getDashboardForUser(userId: string): Promise<DashboardData> {
    const groups = await this.groupRepository.findAllByMember(userId);
    const activities: DashboardActivity[] = [];
    let totalOwed = 0;
    let totalOwing = 0;
    let totalGroupSpend = 0;
    const categoryTotals = new Map<ExpenseCategory, number>(
      expenseCategories.map((category) => [category, 0]),
    );
    const monthlyTotals = new Map<string, number>();
    const groupStats = new Map<string, DashboardMostActiveGroup>();
    let largestExpense: DashboardLargestExpense = {
      id: null,
      title: 'No expenses yet',
      amount: 0,
      category: null,
      groupName: null,
      occurredAt: null,
    };

    const dashboardGroups = await Promise.all(
      groups.map(async (group) => {
        const [expenses, settlements] = await Promise.all([
          this.expenseRepository.findByGroupId(group.id),
          this.settlementRepository.findByGroupId(group.id),
        ]);

        let balance = 0;
        let groupSpend = 0;

        for (const expense of expenses) {
          groupSpend += expense.amount;
          totalGroupSpend += expense.amount;
          categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + expense.amount);
          const monthKey = toMonthKey(expense.createdAt);
          monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) ?? 0) + expense.amount);

          if (expense.amount > largestExpense.amount) {
            largestExpense = this.toLargestExpense(expense, group.name);
          }

          if (expense.paidBy === userId) {
            for (const participant of expense.participants) {
              if (participant.userId === userId) continue;

              balance += participant.amount;
              totalOwed += participant.amount;
            }
          } else {
            const participant = expense.participants.find((item) => item.userId === userId);
            if (participant) {
              balance -= participant.amount;
              totalOwing += participant.amount;
            }
          }

          const participantAmount = expense.participants.find((item) => item.userId === userId)?.amount ?? 0;
          const description = expense.paidBy === userId
            ? `You paid ₹${expense.amount.toFixed(0)} for ${expense.title} in ${group.name}`
            : `You owe ₹${participantAmount.toFixed(0)} for ${expense.title} in ${group.name}`;

          activities.push({
            id: `expense-${group.id}-${expense.id}`,
            description,
            occurredAt: toIsoDate(expense.createdAt),
          });
        }

        groupStats.set(group.id, {
          id: group.id,
          name: group.name,
          expenseCount: expenses.length,
          totalSpend: roundMoney(groupSpend),
        });

        for (const settlement of settlements) {
          const memberName = (memberId: string) =>
            group.members.find((member) => member.userId === memberId)?.name ?? 'Someone';

          if (settlement.fromUserId === userId) {
            balance += settlement.amount;
            totalOwing -= settlement.amount;
          } else if (settlement.toUserId === userId) {
            balance -= settlement.amount;
            totalOwed -= settlement.amount;
          }

          const description = settlement.fromUserId === userId
            ? `You paid ₹${settlement.amount.toFixed(0)} to ${memberName(settlement.toUserId)} in ${group.name}`
            : settlement.toUserId === userId
              ? `${memberName(settlement.fromUserId)} paid you ₹${settlement.amount.toFixed(0)} in ${group.name}`
              : `${memberName(settlement.fromUserId)} paid ${memberName(settlement.toUserId)} ₹${settlement.amount.toFixed(0)} in ${group.name}`;

          activities.push({
            id: `settlement-${group.id}-${settlement.id}`,
            description,
            occurredAt: toIsoDate(settlement.createdAt),
          });
        }

        return {
          id: group.id,
          name: group.name,
          type: group.type,
          memberCount: group.members.length,
          balance,
        };
      }),
    );

    const sortedActivities = activities
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
      .slice(0, 5);

    const analyticsTotalSpend = roundMoney(totalGroupSpend);
    const categoryBreakdown = this.toCategoryBreakdown(categoryTotals, analyticsTotalSpend);
    const monthlySpending = this.toMonthlySpending(monthlyTotals);
    const mostActiveGroup = this.toMostActiveGroup([...groupStats.values()]);

    return {
      summary: {
        totalOwed: Math.max(0, roundMoney(totalOwed)),
        totalOwing: Math.max(0, roundMoney(totalOwing)),
        netBalance: roundMoney(totalOwed - totalOwing),
      },
      groups: dashboardGroups,
      activities: sortedActivities,
      analytics: {
        totalGroupSpend: analyticsTotalSpend,
        categoryBreakdown,
        monthlySpending,
        largestExpense,
        mostActiveGroup,
      },
    };
  }

  private toLargestExpense(expense: ExpenseDocument, groupName: string): DashboardLargestExpense {
    return {
      id: expense.id,
      title: expense.title,
      amount: roundMoney(expense.amount),
      category: expense.category,
      groupName,
      occurredAt: toIsoDate(expense.createdAt),
    };
  }

  private toCategoryBreakdown(
    categoryTotals: Map<ExpenseCategory, number>,
    totalGroupSpend: number,
  ): DashboardCategoryBreakdownItem[] {
    if (totalGroupSpend <= 0) {
      return [];
    }

    return expenseCategories
      .map((category) => {
        const amount = roundMoney(categoryTotals.get(category) ?? 0);
        return {
          category,
          amount,
          percentage: roundMoney((amount / totalGroupSpend) * 100),
        };
      })
      .filter((item) => item.amount > 0)
      .sort((left, right) => right.amount - left.amount);
  }

  private toMonthlySpending(monthlyTotals: Map<string, number>): DashboardMonthlySpendingItem[] {
    return [...monthlyTotals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6)
      .map(([month, amount]) => ({
        month,
        amount: roundMoney(amount),
      }));
  }

  private toMostActiveGroup(groups: DashboardMostActiveGroup[]): DashboardMostActiveGroup {
    return groups.reduce(
      (current, group) => {
        if (
          group.expenseCount > current.expenseCount ||
          (group.expenseCount === current.expenseCount && group.totalSpend > current.totalSpend)
        ) {
          return group;
        }
        return current;
      },
      {
        id: null,
        name: 'No active group',
        expenseCount: 0,
        totalSpend: 0,
      },
    );
  }
}
