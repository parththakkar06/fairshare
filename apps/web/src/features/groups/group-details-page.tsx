import { useState } from 'react';
import { useParams, Navigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, HandCoins, LayoutList, Users } from 'lucide-react';

import { listGroups } from '@/features/groups/groups-api';
import { BalanceView } from '@/features/balances/balance-view';
import { ExpenseList } from '@/features/expenses/expense-list';
import { SettlementForm } from '@/features/settlements/settlement-form';
import { SettlementHistory } from '@/features/settlements/settlement-history';
import { listSettlementsByGroup } from '@/features/settlements/settlements-api';
import { useAuth } from '@/features/auth/auth-context-value';
import { PageMotion } from '@/components/ui/page-motion';
import { cn } from '@/lib/utils';
import type { Group } from '@/features/groups/groups.types';
import type { Settlement } from '@/features/settlements/settlements.types';

type Tab = 'balances' | 'expenses' | 'settlements' | 'members';

export function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('balances');
  const { user } = useAuth();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: listGroups,
    staleTime: 30_000,
  });

  const { data: settlements = [], isLoading: isSettlementsLoading } = useQuery<Settlement[]>({
    queryKey: ['settlements', groupId],
    queryFn: () => listSettlementsByGroup(groupId!),
    enabled: Boolean(groupId) && activeTab === 'settlements',
    staleTime: 30_000,
  });

  const group = groups.find((g) => g.id === groupId);

  if (!isLoading && !group) {
    return <Navigate to="/groups" replace />;
  }

  if (isLoading) {
    return (
      <PageMotion className="max-w-[1400px]">
        <div className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
      </PageMotion>
    );
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: 'balances', label: 'Balances', icon: BarChart3 },
    { id: 'expenses', label: 'Expenses', icon: LayoutList },
    { id: 'settlements', label: 'Settlements', icon: HandCoins },
    { id: 'members', label: 'Members', icon: Users },
  ];

  return (
    <PageMotion className="max-w-[1400px]">
      <div className="mb-8 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Group Details</p>
          <h1 className="mt-3 break-words text-3xl font-semibold text-slate-950">{group?.name}</h1>
          <p className="mt-2 break-words text-sm leading-6 text-slate-500">
            {group?.members.length} members · Invite code {group?.inviteCode}
          </p>
        </div>
      </div>

      <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white/65 p-1.5 shadow-sm backdrop-blur-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'balances' && group && (
        <BalanceView groupId={group.id} members={group.members} />
      )}

      {activeTab === 'expenses' && group && (
        <ExpenseList groupId={group.id} members={group.members} />
      )}

      {activeTab === 'settlements' && group && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="dashboard-card overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-slate-950">Record a settlement</h2>
            <p className="mt-1 text-sm text-slate-500">Log a payment between group members.</p>
            <div className="mt-6">
              <SettlementForm
                groupId={group.id}
                members={group.members}
                currentUserId={user?.id}
              />
            </div>
          </section>

          <section className="dashboard-card overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-slate-950">Settlement history</h2>
            <p className="mt-1 text-sm text-slate-500">All recorded payments in this group.</p>
            <div className="mt-6">
              {isSettlementsLoading ? (
                <div className="space-y-3">
                  <div className="h-20 rounded-3xl bg-slate-100 animate-pulse" />
                  <div className="h-20 rounded-3xl bg-slate-100 animate-pulse" />
                </div>
              ) : (
                <SettlementHistory
                  settlements={settlements.map((settlement) => ({
                    id: settlement.id,
                    fromUserId: settlement.fromUserId,
                    toUserId: settlement.toUserId,
                    amount: settlement.amount,
                    note: settlement.note,
                    createdAt: settlement.createdAt,
                  }))}
                  members={group.members}
                  currentUserId={user?.id}
                />
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'members' && group && (
        <div className="dashboard-card overflow-hidden p-6">
          <h2 className="text-lg font-semibold text-slate-950">Group members</h2>
          <div className="mt-6 space-y-3">
            {group.members.map((member) => (
              <div key={member.userId} className="interactive-surface flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-950">
                    {member.userId === user?.id ? 'You' : member.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">{member.userId}</p>
                </div>
                <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">Member</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageMotion>
  );
}
