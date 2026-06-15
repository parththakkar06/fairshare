import type { LucideIcon } from 'lucide-react';

interface EmptyPanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyPanel({ icon: Icon, title, description, action }: EmptyPanelProps) {
  return (
    <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
