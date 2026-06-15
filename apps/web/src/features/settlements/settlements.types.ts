export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettlementInput {
  groupId: string;
  toUserId: string;
  amount: number;
  note?: string;
}
