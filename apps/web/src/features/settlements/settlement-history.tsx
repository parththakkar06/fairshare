import { CheckCircle2 } from 'lucide-react';

import type { SettlementRecord } from '@/features/balances/balance.types';
import type { GroupMember } from '@/features/groups/groups.types';

interface SettlementHistoryProps {
  settlements: SettlementRecord[];
  members: GroupMember[];
  currentUserId?: string;
  emptyMessage?: string;
}

export function SettlementHistory({
  settlements,
  members,
  currentUserId,
  emptyMessage = 'No settlements recorded yet.',
}: SettlementHistoryProps) {
  const getMemberName = (userId: string) => {
    if (userId === currentUserId) return 'You';
    return members.find((member) => member.userId === userId)?.name ?? 'Member';
  };

  if (settlements.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((settlement) => (
        <div key={settlement.id} className="interactive-surface rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-slate-950">
                {getMemberName(settlement.fromUserId)} paid {getMemberName(settlement.toUserId)}
              </p>
              <p className="mt-1 break-words text-sm text-slate-500">
                ₹{settlement.amount.toFixed(2)} · {settlement.note || 'No note'}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                {new Date(settlement.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
