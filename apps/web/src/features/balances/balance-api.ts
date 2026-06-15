import { apiClient } from '@/lib/api-client';
import type { GroupBalance } from './balance.types';

export async function getGroupBalance(groupId: string): Promise<GroupBalance> {
  const { data } = await apiClient.get<GroupBalance>(`/balances/group/${groupId}`);
  return data;
}
