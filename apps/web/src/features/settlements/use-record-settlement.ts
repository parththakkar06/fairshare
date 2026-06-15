import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createSettlement } from '@/features/settlements/settlements-api';
import type { CreateSettlementInput } from '@/features/settlements/settlements.types';

export function useRecordSettlement(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSettlementInput) => createSettlement(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settlements', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['balance', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
      ]);
    },
  });
}
