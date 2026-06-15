import type { Expense, CreateExpenseInput, UpdateExpenseInput } from './expenses.types';
import { apiClient } from '@/lib/api-client';

interface ExpenseResponse {
  expense: Expense;
}

interface ExpensesResponse {
  expenses: Expense[];
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data } = await apiClient.post<ExpenseResponse>('/expenses', input);
  return data.expense;
}

export async function listExpensesByGroup(groupId: string): Promise<Expense[]> {
  const { data } = await apiClient.get<ExpensesResponse>(`/expenses/group/${groupId}`);
  return data.expenses;
}

export async function updateExpense(expenseId: string, input: UpdateExpenseInput): Promise<Expense> {
  const { data } = await apiClient.put<ExpenseResponse>(`/expenses/${expenseId}`, input);
  return data.expense;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await apiClient.delete(`/expenses/${expenseId}`);
}
