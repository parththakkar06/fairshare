import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/features/auth/auth-context-value';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center" aria-label="Loading session">
        <LoaderCircle className="size-7 animate-spin text-indigo-600" />
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
