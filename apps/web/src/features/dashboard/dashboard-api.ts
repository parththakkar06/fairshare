import type { DashboardData } from './dashboard.types';
import { apiClient } from '@/lib/api-client';

interface DashboardResponse {
  dashboard: DashboardData;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get<DashboardResponse>('/dashboard');
  return data.dashboard;
}
