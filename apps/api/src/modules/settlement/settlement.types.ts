export interface SettlementDocument {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSettlementInput {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note?: string;
}
