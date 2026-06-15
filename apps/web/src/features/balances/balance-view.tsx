import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getGroupBalance } from '@/features/balances/balance-api';
import type { GroupBalance } from '@/features/balances/balance.types';
import { useAuth } from '@/features/auth/auth-context-value';
import { formatInr } from '@/features/dashboard/currency';
import type { GroupMember } from '@/features/groups/groups.types';
import { SettlementHistory } from '@/features/settlements/settlement-history';
import { useRecordSettlement } from '@/features/settlements/use-record-settlement';

interface BalanceViewProps {
  groupId: string;
  members: GroupMember[];
}

export function BalanceView({ groupId, members }: BalanceViewProps) {
  const { user } = useAuth();
  const recordSettlement = useRecordSettlement(groupId);

  const { data: balance, isLoading } = useQuery<GroupBalance>({
    queryKey: ['balance', groupId],
    queryFn: () => getGroupBalance(groupId),
    staleTime: 30_000,
  });

  async function handleSettleUp(suggestion: GroupBalance['suggestions'][number]) {
    await recordSettlement.mutateAsync({
      groupId,
      toUserId: suggestion.toUserId,
      amount: suggestion.amount,
      note: `Settled with ${suggestion.toName}`,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="h-60 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="h-60 rounded-3xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-500">No balance data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Total spent</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{formatInr(balance.totalExpenses)}</p>
            </div>
            <div className="rounded-3xl bg-emerald-100 p-3 text-emerald-700">
              <TrendingUp className="size-6" />
            </div>
          </div>
        </div>

        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Settled</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{formatInr(balance.totalSettled)}</p>
            </div>
            <div className="rounded-3xl bg-blue-100 p-3 text-blue-700">
              <TrendingDown className="size-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-slate-950">Member balances</h2>
        <p className="mt-1 text-sm text-slate-500">Current balance for each member in the group</p>

        <div className="mt-6 space-y-3">
          {balance.members.map((member) => (
            <div key={member.userId} className="interactive-surface flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-950">
                  {member.userId === user?.id ? 'You' : member.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {member.balance === 0
                    ? 'Settled'
                    : member.balance > 0
                      ? `is owed ${formatInr(member.isOwedAmount)}`
                      : `owes ${formatInr(member.owesAmount)}`}
                </p>
              </div>
              <div className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold ${member.balance === 0 ? 'bg-slate-100 text-slate-700' : member.balance > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {member.balance > 0 ? '+' : ''}{formatInr(Math.abs(member.balance))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-card overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-slate-950">Smart settlements</h2>
        <p className="mt-1 text-sm text-slate-500">Optimized payments to clear all debts with minimum transactions</p>

        {balance.suggestions.length > 0 ? (
          <div className="mt-6 space-y-3">
            {balance.suggestions.map((suggestion, index) => {
              const canSettle = suggestion.fromUserId === user?.id;

              return (
                <div
                  key={`${suggestion.fromUserId}-${suggestion.toUserId}-${index}`}
                  className="interactive-surface flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-indigo-50 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-950">
                        {suggestion.fromUserId === user?.id ? 'You' : suggestion.fromName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        pays {suggestion.toUserId === user?.id ? 'you' : suggestion.toName}
                      </p>
                    </div>
                    <ArrowRightLeft className="h-5 w-5 text-slate-300" aria-hidden="true" />
                    <div className="text-right">
                      <p className="text-lg font-semibold text-indigo-600">{formatInr(suggestion.amount)}</p>
                    </div>
                  </div>

                  {canSettle ? (
                    <Button
                      onClick={() => handleSettleUp(suggestion)}
                      disabled={recordSettlement.isPending}
                      className="w-full shrink-0 sm:w-auto"
                    >
                      <CheckCircle2 className="size-4" />
                      {recordSettlement.isPending ? 'Settling...' : 'Mark settled'}
                    </Button>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      Pending
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-500">All members are settled up!</p>
          </div>
        )}
      </div>

      <div className="dashboard-card overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-slate-950">Settlement history</h2>
        <p className="mt-1 text-sm text-slate-500">Previously recorded payments in this group</p>

        <div className="mt-6">
          <SettlementHistory
            settlements={balance.history}
            members={members}
            currentUserId={user?.id}
          />
        </div>
      </div>
    </div>
  );
}
