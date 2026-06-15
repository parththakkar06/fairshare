import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { fetchDashboard } from '@/features/dashboard/dashboard-api';
import { AnalyticsPanel } from '@/features/dashboard/analytics-panel';
import { Button } from '@/components/ui/button';
import { EmptyPanel } from '@/features/dashboard/empty-panel';
import { formatInr } from '@/features/dashboard/currency';
import { GroupCard } from '@/features/dashboard/group-card';
import { InsightCard } from '@/features/dashboard/insight-card';
import { PageMotion } from '@/components/ui/page-motion';
import { SummaryCard } from '@/features/dashboard/summary-card';
import { useAuth } from '@/features/auth/auth-context-value';
import type { DashboardAnalytics } from '@/features/dashboard/dashboard.types';

const emptyAnalytics: DashboardAnalytics = {
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
};

export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name.split(/\s+/)[0] ?? 'there';
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const summary = dashboard?.summary ?? { totalOwed: 0, totalOwing: 0, netBalance: 0 };
  const groups = dashboard?.groups ?? [];
  const activities = dashboard?.activities ?? [];
  const analytics = dashboard?.analytics ?? emptyAnalytics;
  const largestExpense = analytics.largestExpense.amount > 0
    ? `${formatInr(analytics.largestExpense.amount)} ${analytics.largestExpense.title}`
    : 'No expenses yet';
  const mostActiveGroup = analytics.mostActiveGroup.id
    ? analytics.mostActiveGroup.name
    : 'No active group';
  const isEmpty = !isLoading && groups.length === 0;

  return (
    <PageMotion>
      <header className="flex flex-col gap-6 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            <Sparkles className="size-4 text-indigo-500" aria-hidden="true" />
            Your shared money space
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">
            Good to see you, {firstName}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            A clean, premium dashboard for group expense stories. Build momentum with groups, balances, and activity in one place.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" size="icon" aria-label="Notifications" disabled>
            <Bell className="size-4" />
          </Button>
          <Button disabled>
            <Plus className="size-4" />
            Create group
          </Button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="You owe"
            value={summary.totalOwing}
            helper="Across all groups"
            icon={ArrowUpRight}
            tone="rose"
          />
          <SummaryCard
            label="You are owed"
            value={summary.totalOwed}
            helper="Across all groups"
            icon={ArrowDownLeft}
            tone="emerald"
            delay={0.05}
          />
          <SummaryCard
            label="Net balance"
            value={summary.netBalance}
            helper="Your current position"
            icon={CircleDollarSign}
            tone="indigo"
            delay={0.1}
          />
        </div>

        <article className="dashboard-card overflow-hidden p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Balance signal</p>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                {isLoading
                  ? 'Loading your latest balance…'
                  : isEmpty
                  ? 'No active group data yet'
                  : 'Your current balance signal'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isLoading
                  ? 'Fetching the latest totals from your groups and expenses.'
                  : isEmpty
                  ? 'After your first group and expense, the dashboard will begin to animate with actual totals, member balances, and activity.'
                  : `Your latest position across ${groups.length} groups is shown in the summary above.`}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
              Live overview
            </div>
          </div>
        </article>
      </section>

      <AnalyticsPanel analytics={analytics} />

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.3fr_0.95fr]">
        <article className="dashboard-card overflow-hidden p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Group highlights</h2>
              <p className="mt-1 text-sm text-slate-500">A quick visual summary across your shared groups.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {groups.length} groups
            </span>
          </div>

          {groups.length === 0 ? (
            <EmptyPanel
              icon={UsersRound}
              title="Your groups will live here"
              description="Create a group for a trip, home, party, office, or shared meal in the next phase."
              action={
                <Button variant="outline" disabled>
                  <Plus className="size-4" />
                  Create first group
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 py-6">
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </article>

        <div className="grid gap-4">
          <InsightCard
            label="Largest expense"
            value={largestExpense}
            helper="Shows your biggest shared spend"
            icon={ReceiptText}
            tone="slate"
          />
          <InsightCard
            label="Recent activity"
            value={activities.length > 0 ? 'Active' : 'No data yet'}
            helper="Settlements and expenses will appear here"
            icon={Sparkles}
            tone="violet"
            delay={0.05}
          />
          <InsightCard
            label="Most active group"
            value={mostActiveGroup}
            helper="Insights arrive once groups are activated"
            icon={UsersRound}
            tone="amber"
            delay={0.1}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <article className="dashboard-card overflow-hidden p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recent activity</h2>
              <p className="mt-1 text-sm text-slate-500">A timeline of your group events.</p>
            </div>
            <ReceiptText className="size-5 text-slate-400" aria-hidden="true" />
          </div>

          {activities.length === 0 ? (
            <EmptyPanel
              icon={ReceiptText}
              title="Nothing to report yet"
              description="Expenses, settlements, and membership updates will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-200/70">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 px-4 py-5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                    <ReceiptText className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{activity.description}</p>
                    <p className="mt-1 text-sm text-slate-500">{activity.occurredAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </PageMotion>
  );
}
