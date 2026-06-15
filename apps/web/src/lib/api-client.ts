import axios from 'axios';

import { webEnv } from '@/lib/env';
import { refreshSession } from '@/features/auth/auth-api';
import { getAccessToken, setAccessToken } from '@/lib/token-store';

export const apiClient = axios.create({
  baseURL: webEnv.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshRequest: ReturnType<typeof refreshSession> | null = null;

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    return Promise.reject(toError(error));
  }

  const config = error.config as typeof error.config & { _retry?: boolean };
  if (config._retry) return Promise.reject(toError(error));
  config._retry = true;

  try {
    refreshRequest ??= refreshSession().finally(() => {
      refreshRequest = null;
    });
    const session = await refreshRequest;
    setAccessToken(session.accessToken);
    config.headers.Authorization = `Bearer ${session.accessToken}`;
    return apiClient(config);
  } catch (refreshError) {
    setAccessToken(null);
    return Promise.reject(toError(refreshError));
  }
});

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error('An unexpected API error occurred.');
}
