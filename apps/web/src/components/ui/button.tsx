import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70',
  {
    variants: {
      variant: {
        default: 'bg-slate-950 text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800',
        outline: 'border border-slate-200 bg-white/70 text-slate-900 hover:bg-white',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
      },
      size: {
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-5 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
