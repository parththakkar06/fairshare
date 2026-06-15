import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';

import { ProtectedRoute } from '@/features/auth/protected-route';
import { DashboardSkeleton } from '@/features/dashboard/dashboard-skeleton';
import { AppShell } from '@/layouts/app-shell';

const AuthPage = lazy(() =>
  import('@/features/auth/auth-page').then((module) => ({ default: module.AuthPage })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
);
const GroupListPage = lazy(() =>
  import('@/features/groups/group-list').then((module) => ({ default: module.GroupList })),
);
const ExpensesPage = lazy(() =>
  import('@/features/expenses/expenses-page').then((module) => ({ default: module.ExpensesPage })),
);
const SettlementsPage = lazy(() =>
  import('@/features/settlements/settlements-page').then((module) => ({ default: module.SettlementsPage })),
);
const AnalyticsPage = lazy(() =>
  import('@/features/analytics/analytics-page').then((module) => ({ default: module.AnalyticsPage })),
);
const GroupDetailsPage = lazy(() =>
  import('@/features/groups/group-details-page').then((module) => ({ default: module.GroupDetailsPage })),
);

function load(element: ReactNode) {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<DashboardSkeleton />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'groups',
            element: (
              <Suspense fallback={<DashboardSkeleton />}>
                <GroupListPage />
              </Suspense>
            ),
          },
          {
            path: 'groups/:groupId',
            element: (
              <Suspense fallback={<DashboardSkeleton />}>
                <GroupDetailsPage />
              </Suspense>
            ),
          },
          {
            path: 'expenses',
            element: (
              <Suspense fallback={<DashboardSkeleton />}>
                <ExpensesPage />
              </Suspense>
            ),
          },
          {
            path: 'settlements',
            element: (
              <Suspense fallback={<DashboardSkeleton />}>
                <SettlementsPage />
              </Suspense>
            ),
          },
          {
            path: 'analytics',
            element: (
              <Suspense fallback={<DashboardSkeleton />}>
                <AnalyticsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  { path: '/login', element: load(<AuthPage mode="login" />) },
  { path: '/register', element: load(<AuthPage mode="register" />) },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
