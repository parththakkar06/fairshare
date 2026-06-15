import axios from 'axios';

import { webEnv } from '@/lib/env';
import type { AuthSession, LoginInput, RegisterInput } from '@/features/auth/auth.types';

const authClient = axios.create({
  baseURL: webEnv.VITE_API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

export async function registerAccount(input: RegisterInput): Promise<AuthSession> {
  const { data } = await authClient.post<AuthSession>('/auth/register', input);
  return data;
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const { data } = await authClient.post<AuthSession>('/auth/login', input);
  return data;
}

export async function refreshSession(): Promise<AuthSession> {
  const { data } = await authClient.post<AuthSession>('/auth/refresh');
  return data;
}

export async function logout(): Promise<void> {
  await authClient.post('/auth/logout');
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data.error?.message ?? 'Unable to reach the server. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
