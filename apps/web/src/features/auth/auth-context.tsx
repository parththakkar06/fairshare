import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  registerAccount,
} from '@/features/auth/auth-api';
import type { AuthUser } from '@/features/auth/auth.types';
import { setAccessToken } from '@/lib/token-store';
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context-value';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((session: Awaited<ReturnType<typeof refreshSession>>) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  useEffect(() => {
    let active = true;

    void refreshSession()
      .then((session) => {
        if (active) applySession(session);
      })
      .catch(() => {
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (input) => applySession(await loginRequest(input)),
      register: async (input) => applySession(await registerAccount(input)),
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          setAccessToken(null);
          setUser(null);
        }
      },
    }),
    [applySession, isLoading, user],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
