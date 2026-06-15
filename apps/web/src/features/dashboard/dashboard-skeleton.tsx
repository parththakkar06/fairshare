import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-40" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
