import type { GroupType } from '../group/group.types.js';
import type { ExpenseCategory } from '../expense/expense.types.js';

export interface DashboardSummary {
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
}

export interface DashboardGroup {
  id: string;
  name: string;
  type: GroupType;
  memberCount: number;
  balance: number;
}

export interface DashboardActivity {
  id: string;
  description: string;
  occurredAt: string;
}

export interface DashboardCategoryBreakdownItem {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
}

export interface DashboardMonthlySpendingItem {
  month: string;
  amount: number;
}

export interface DashboardLargestExpense {
  id: string | null;
  title: string;
  amount: number;
  category: ExpenseCategory | null;
  groupName: string | null;
  occurredAt: string | null;
}

export interface DashboardMostActiveGroup {
  id: string | null;
  name: string;
  expenseCount: number;
  totalSpend: number;
}

export interface DashboardAnalytics {
  totalGroupSpend: number;
  categoryBreakdown: DashboardCategoryBreakdownItem[];
  monthlySpending: DashboardMonthlySpendingItem[];
  largestExpense: DashboardLargestExpense;
  mostActiveGroup: DashboardMostActiveGroup;
}

export interface DashboardData {
  summary: DashboardSummary;
  groups: DashboardGroup[];
  activities: DashboardActivity[];
  analytics: DashboardAnalytics;
}
