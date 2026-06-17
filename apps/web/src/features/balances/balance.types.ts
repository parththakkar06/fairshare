export interface MemberBalance {
  userId: string;
  name: string;
  balance: number;
  owesAmount: number;
  isOwedAmount: number;
  /** True if the user is currently an active member. Former members with outstanding balances will have false. */
  isCurrentMember: boolean;
}

export interface SettlementSuggestion {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface SettlementRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface GroupBalance {
  groupId: string;
  groupName: string;
  members: MemberBalance[];
  suggestions: SettlementSuggestion[];
  history: SettlementRecord[];
  totalExpenses: number;
  totalSettled: number;
}
