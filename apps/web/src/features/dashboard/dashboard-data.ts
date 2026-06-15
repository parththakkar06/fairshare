import type { DashboardData } from '@/features/dashboard/dashboard.types';

// Empty dashboard state used while authenticated data is loading or unavailable.
export const emptyDashboard: DashboardData = {
  summary: {
    totalOwed: 0,
    totalOwing: 0,
    netBalance: 0,
  },
  groups: [],
  activities: [],
  analytics: {
    totalGroupSpend: 0,
    categoryBreakdown: [],
    monthlySpending: [],
    largestExpense: {
      id: null,
      title: 'No expenses yet',
      amount: 0,
      category: null,
      groupName: null,
      occurredAt: null,
    },
    mostActiveGroup: {
      id: null,
      name: 'No active group',
      expenseCount: 0,
      totalSpend: 0,
    },
  },
};
