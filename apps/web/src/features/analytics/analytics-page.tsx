import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp } from 'lucide-react';

import { fetchDashboard } from '@/features/dashboard/dashboard-api';
import { AnalyticsPanel } from '@/features/dashboard/analytics-panel';
import { emptyDashboard } from '@/features/dashboard/dashboard-data';
import { formatInr } from '@/features/dashboard/currency';
import { PageMotion } from '@/components/ui/page-motion';

export function AnalyticsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const analytics = dashboard?.analytics ?? emptyDashboard.analytics;

  return (
    <PageMotion>
      <header className="dashboard-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              <BarChart3 className="size-4 text-slate-700" aria-hidden="true" />
              Analytics Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">
              Understand where group money moves.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Track total spend, category concentration, monthly patterns, largest expenses, and the groups driving the most activity.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white shadow-xl shadow-slate-950/10">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <TrendingUp className="size-4" aria-hidden="true" />
              Total spend
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {formatInr(analytics.totalGroupSpend)}
            </p>
          </div>
        </div>
      </header>

      <AnalyticsPanel analytics={analytics} />
    </PageMotion>
  );
}
