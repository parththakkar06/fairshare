import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  className?: string;
}

export function Avatar({ name, className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-md shadow-indigo-500/20',
        className,
      )}
      aria-label={name}
    >
      {initials || 'U'}
    </span>
  );
}
