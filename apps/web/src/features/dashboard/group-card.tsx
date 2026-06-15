import { motion } from 'framer-motion';
import { Home, MapPin, PartyPopper, ShoppingBag, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DashboardGroup } from '@/features/dashboard/dashboard.types';

const typeStyles = {
  trip: { label: 'Trip', icon: MapPin, accent: 'from-cyan-200 to-sky-100 text-sky-700' },
  home: { label: 'Home', icon: Home, accent: 'from-amber-200 to-orange-100 text-orange-700' },
  party: { label: 'Party', icon: PartyPopper, accent: 'from-fuchsia-200 to-pink-100 text-pink-700' },
  office: { label: 'Office', icon: Users, accent: 'from-violet-200 to-indigo-100 text-violet-700' },
  food: { label: 'Food', icon: ShoppingBag, accent: 'from-emerald-200 to-lime-100 text-emerald-700' },
} as const;

interface GroupCardProps {
  group: DashboardGroup;
}

export function GroupCard({ group }: GroupCardProps) {
  const type = typeStyles[group.type];
  const Icon = type.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="dashboard-card overflow-hidden p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            <span className={cn('grid size-8 place-items-center rounded-2xl bg-gradient-to-br', type.accent)}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            {type.label}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">{group.name}</h3>
          <p className="mt-2 text-sm text-slate-500">{group.memberCount} members · Balance {group.balance >= 0 ? 'owed to you' : 'you owe'}</p>
        </div>
        <div className="rounded-3xl bg-slate-100 px-4 py-2 text-right text-sm font-semibold text-slate-900">
          {group.balance >= 0 ? `₹${group.balance.toFixed(0)}` : `-₹${Math.abs(group.balance).toFixed(0)}`}
        </div>
      </div>
    </motion.article>
  );
}
