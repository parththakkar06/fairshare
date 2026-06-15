import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react';

import { listGroups } from '@/features/groups/groups-api';
import { SettlementForm } from '@/features/settlements/settlement-form';
import { SettlementHistory } from '@/features/settlements/settlement-history';
import { listSettlementsByGroup } from '@/features/settlements/settlements-api';
import { useAuth } from '@/features/auth/auth-context-value';
import { PageMotion } from '@/components/ui/page-motion';
import type { Group } from '@/features/groups/groups.types';
import type { Settlement } from '@/features/settlements/settlements.types';

export function SettlementsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const { user } = useAuth();

  const { data: groups = [], isLoading: isGroupLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: listGroups,
    staleTime: 30_000,
  });

  const { data: settlements = [], isLoading: isSettlementsLoading } = useQuery<Settlement[]>({
    queryKey: ['settlements', selectedGroupId],
    queryFn: () => listSettlementsByGroup(selectedGroupId),
    enabled: Boolean(selectedGroupId),
    staleTime: 30_000,
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  return (
    <PageMotion className="max-w-[1400px]">
      <header className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Settlements</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Clear shared balances quickly</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Record payments between members and keep group balances up to date.</p>
        </div>
        <div className="rounded-3xl bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">Smart payments</div>
      </header>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-slate-700">Group</label>
        <select
          value={selectedGroupId}
          onChange={(event) => setSelectedGroupId(event.target.value)}
          disabled={isGroupLoading}
          className="form-select max-w-md"
        >
          <option value="">Select a group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {selectedGroup ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="dashboard-card overflow-hidden p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-3xl bg-indigo-100 p-3 text-indigo-700">
                <HandCoins className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Record a settlement</h2>
                <p className="mt-1 text-sm text-slate-500">Log a payment you made to another group member.</p>
              </div>
            </div>

            <SettlementForm
              groupId={selectedGroup.id}
              members={selectedGroup.members}
              currentUserId={user?.id}
            />
          </section>

          <section className="dashboard-card overflow-hidden p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-950">Recent settlements</h2>
              <p className="mt-2 text-sm text-slate-500">Review recently logged payments for {selectedGroup.name}.</p>
            </div>

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
                members={selectedGroup.members}
                currentUserId={user?.id}
                emptyMessage="No settlements recorded for this group yet."
              />
            )}
          </section>
        </div>
      ) : (
        <div className="dashboard-card flex min-h-[16rem] items-center justify-center p-8 text-center">
          <p className="text-sm text-slate-500">Select a group to record or view settlements.</p>
        </div>
      )}
    </PageMotion>
  );
}
