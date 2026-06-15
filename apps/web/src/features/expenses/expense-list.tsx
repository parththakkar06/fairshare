import { motion } from 'framer-motion';
import { ClipboardX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { listExpensesByGroup } from '@/features/expenses/expenses-api';
import type { Expense } from '@/features/expenses/expenses.types';
import type { GroupMember } from '@/features/groups/groups.types';

interface ExpenseListProps {
  groupId: string;
  members: GroupMember[];
}

export function ExpenseList({ groupId, members }: ExpenseListProps) {
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses', groupId],
    queryFn: () => listExpensesByGroup(groupId),
    enabled: Boolean(groupId),
    staleTime: 30_000,
  });

  if (!groupId) {
    return (
      <div className="dashboard-card flex min-h-[18rem] items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Select a group</p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">Choose a group to show expenses</h2>
          <p className="mt-3 text-sm text-slate-500">Expenses are grouped by shared group membership.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-4">
      {isLoading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="dashboard-card h-28 animate-pulse" />
        ))
      ) : expenses.length > 0 ? (
        expenses.map((expense) => {
          const payerName = members.find((member) => member.userId === expense.paidBy)?.name ?? expense.paidBy;

          return (
            <motion.article
              key={expense.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="dashboard-card interactive-surface overflow-hidden p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-semibold text-slate-950">{expense.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">{expense.category}</p>
                </div>
                <div className="w-fit rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                  ₹{expense.amount.toFixed(2)}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>{payerName} paid</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                  <ClipboardX className="size-4" />
                  {expense.participants.length} participants
                </span>
              </div>
            </motion.article>
          );
        })
      ) : (
        <div className="dashboard-card flex min-h-[18rem] items-center justify-center p-8 text-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">No expenses found</p>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">This group has no expenses yet</h2>
            <p className="mt-3 text-sm text-slate-500">Add an expense to start tracking shared spending for this group.</p>
          </div>
        </div>
      )}
    </section>
  );
}
