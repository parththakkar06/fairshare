import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { App } from '@/app/App';

vi.mock('@/features/auth/auth-api', () => ({
  refreshSession: vi.fn().mockRejectedValue(new Error('No session')),
  login: vi.fn(),
  registerAccount: vi.fn(),
  logout: vi.fn(),
  getApiErrorMessage: vi.fn(() => 'Unable to sign in.'),
}));

describe('App', () => {
  it('redirects unauthenticated visitors to the login page', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: /sign in to continue/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument();
  });
});
