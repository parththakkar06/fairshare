import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface InsightCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: 'slate' | 'emerald' | 'violet' | 'amber';
  delay?: number;
}

const tones = {
  slate: {
    icon: 'bg-slate-100 text-slate-700',
    glow: 'from-slate-200/60',
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-700',
    glow: 'from-emerald-200/55',
  },
  violet: {
    icon: 'bg-violet-100 text-violet-700',
    glow: 'from-violet-200/55',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-700',
    glow: 'from-amber-200/55',
  },
} as const;

export function InsightCard({ label, value, helper, icon: Icon, tone, delay = 0 }: InsightCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.36, ease: 'easeOut' }}
      className="dashboard-card overflow-hidden p-5 sm:p-6"
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
          <p className="mt-4 break-words text-3xl font-semibold text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <span className={cn('grid size-11 place-items-center rounded-3xl', tones[tone].icon)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </motion.article>
  );
}
