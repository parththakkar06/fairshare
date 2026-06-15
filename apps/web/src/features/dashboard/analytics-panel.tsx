import { motion } from 'framer-motion';
import { BarChart3, ChartPie, TrendingUp } from 'lucide-react';

import { EmptyPanel } from '@/features/dashboard/empty-panel';
import { formatInr } from '@/features/dashboard/currency';
import type { DashboardAnalytics, ExpenseCategory } from '@/features/dashboard/dashboard.types';
import { cn } from '@/lib/utils';

interface AnalyticsPanelProps {
  analytics: DashboardAnalytics;
}

const categoryLabels: Record<ExpenseCategory, string> = {
  food: 'Food',
  travel: 'Travel',
  rent: 'Rent',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  education: 'Education',
  other: 'Other',
};

const categoryColors: Record<ExpenseCategory, string> = {
  food: 'bg-emerald-500',
  travel: 'bg-sky-500',
  rent: 'bg-violet-500',
  shopping: 'bg-pink-500',
  entertainment: 'bg-amber-500',
  education: 'bg-indigo-500',
  other: 'bg-slate-500',
};

const monthFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: '2-digit',
});

function formatMonth(month: string): string {
  const [yearText = '0', monthText = '1'] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  return monthFormatter.format(new Date(year, monthIndex - 1, 1));
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  const hasAnalytics = analytics.totalGroupSpend > 0;
  const maxMonthlySpend = Math.max(...analytics.monthlySpending.map((item) => item.amount), 0);

  return (
    <section className="mt-8 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: 'easeOut' }}
        className="dashboard-card overflow-hidden p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Analytics</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Spending intelligence</h2>
          </div>
          <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
            <BarChart3 className="size-5" aria-hidden="true" />
          </span>
        </div>

        {hasAnalytics ? (
          <div className="grid gap-5 pt-5">
            <div>
              <p className="text-sm text-slate-500">Total group spend</p>
              <p className="mt-2 text-4xl font-semibold text-slate-950">
                {formatInr(analytics.totalGroupSpend)}
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Largest expense</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {analytics.largestExpense.groupName ?? 'No group yet'}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  {analytics.largestExpense.category
                    ? categoryLabels[analytics.largestExpense.category]
                    : 'None'}
                </span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <p className="min-w-0 truncate text-lg font-semibold text-slate-950">
                  {analytics.largestExpense.title}
                </p>
                <p className="shrink-0 text-lg font-semibold text-slate-950">
                  {formatInr(analytics.largestExpense.amount)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl bg-slate-50/80 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Most active group</p>
              </div>
              <div className="flex items-end justify-between gap-4">
                <p className="min-w-0 truncate text-lg font-semibold text-slate-950">
                  {analytics.mostActiveGroup.name}
                </p>
                <p className="shrink-0 text-sm font-medium text-slate-500">
                  {analytics.mostActiveGroup.expenseCount} expenses
                </p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyPanel
            icon={BarChart3}
            title="Analytics will appear here"
            description="Add expenses to see total spend, top categories, monthly patterns, and active groups."
          />
        )}
      </motion.article>

      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.36, ease: 'easeOut' }}
        className="dashboard-card overflow-hidden p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Category and monthly spend</h2>
            <p className="mt-1 text-sm text-slate-500">Breakdowns across all groups you belong to.</p>
          </div>
          <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
            <ChartPie className="size-5" aria-hidden="true" />
          </span>
        </div>

        {hasAnalytics ? (
          <div className="grid gap-8 pt-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              {analytics.categoryBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('size-2.5 rounded-full', categoryColors[item.category])} />
                      <span className="truncate text-sm font-medium text-slate-700">
                        {categoryLabels[item.category]}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-950">
                      {formatInr(item.amount)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full', categoryColors[item.category])}
                      style={{ width: `${Math.max(item.percentage, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid min-h-64 grid-cols-6 items-end gap-3 rounded-2xl bg-slate-50/80 p-4">
              {analytics.monthlySpending.map((item) => {
                const height = maxMonthlySpend > 0 ? Math.max((item.amount / maxMonthlySpend) * 100, 8) : 8;

                return (
                  <div key={item.month} className="grid h-full min-w-0 grid-rows-[1fr_auto] gap-3">
                    <div className="flex h-full items-end">
                      <div
                        className="w-full rounded-t-xl bg-slate-900 shadow-sm"
                        style={{ height: `${height}%` }}
                        title={`${formatMonth(item.month)}: ${formatInr(item.amount)}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="truncate text-xs font-semibold text-slate-700">{formatMonth(item.month)}</p>
                      <p className="truncate text-[0.68rem] text-slate-400">{formatInr(item.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyPanel
            icon={ChartPie}
            title="No spending patterns yet"
            description="Category and monthly charts start filling after expenses are added."
          />
        )}
      </motion.article>
    </section>
  );
}
