import type { Settlement, CreateSettlementInput } from './settlements.types';
import { apiClient } from '@/lib/api-client';

interface CreateSettlementResponse {
  settlement: Settlement;
}

interface GroupSettlementsResponse {
  settlements: Settlement[];
}

export async function listSettlementsByGroup(groupId: string): Promise<Settlement[]> {
  const { data } = await apiClient.get<GroupSettlementsResponse>(`/settlements/group/${groupId}`);
  return data.settlements;
}

export async function createSettlement(input: CreateSettlementInput): Promise<Settlement> {
  const { data } = await apiClient.post<CreateSettlementResponse>('/settlements', input);
  return data.settlement;
}
