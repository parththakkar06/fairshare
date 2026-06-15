import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context-value';
import { DashboardPage } from '@/features/dashboard/dashboard-page';

vi.mock('@/features/dashboard/dashboard-api', () => ({
  fetchDashboard: async () => ({
    summary: { totalOwed: 0, totalOwing: 0, netBalance: 0 },
    groups: [],
    activities: [],
    analytics: {
      totalGroupSpend: 0,
      categoryBreakdown: [],
      monthlySpending: [],
      largestExpense: {
        id: null,
        title: 'No expenses yet',
        amount: 0,
        category: null,
        groupName: null,
        occurredAt: null,
      },
      mostActiveGroup: {
        id: null,
        name: 'No active group',
        expenseCount: 0,
        totalSpend: 0,
      },
    },
  }),
}));

describe('DashboardPage', () => {
  it('renders personalized zero-state dashboard content', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext
          value={{
            user: {
              id: 'user-1',
              name: 'Jeet Patel',
              email: 'jeet@example.com',
              createdAt: new Date().toISOString(),
            },
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <DashboardPage />
        </AuthContext>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: /good to see you, jeet/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /no active group data yet/i })).toBeInTheDocument();
    expect(screen.getByText('Your groups will live here')).toBeInTheDocument();
    expect(screen.getByText('Nothing to report yet')).toBeInTheDocument();
    expect(screen.getByText('Analytics will appear here')).toBeInTheDocument();
  });
});
