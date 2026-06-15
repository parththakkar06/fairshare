import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { formatInr } from '@/features/dashboard/currency';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  label: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone: 'rose' | 'emerald' | 'indigo';
  delay?: number;
}

const tones = {
  rose: {
    icon: 'bg-rose-100 text-rose-600',
    glow: 'from-rose-200/35',
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-600',
    glow: 'from-emerald-200/35',
  },
  indigo: {
    icon: 'bg-indigo-100 text-indigo-600',
    glow: 'from-indigo-200/40',
  },
} as const;

export function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  delay = 0,
}: SummaryCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="dashboard-card group relative overflow-hidden p-5 sm:p-6"
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent opacity-60',
          tones[tone].glow,
        )}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {formatInr(value)}
          </p>
          <p className="mt-2 text-xs text-slate-400">{helper}</p>
        </div>
        <span className={cn('grid size-10 place-items-center rounded-xl', tones[tone].icon)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </motion.article>
  );
}
