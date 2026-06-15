export type ExpenseCategory =
  | 'food'
  | 'travel'
  | 'rent'
  | 'shopping'
  | 'entertainment'
  | 'education'
  | 'other';

export type ExpenseSplitType = 'equal' | 'exact' | 'percentage';

export interface ExpenseParticipant {
  userId: string;
  amount: number;
  percentage?: number | undefined;
}

export interface ExpenseDocument {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  paidBy: string;
  participants: ExpenseParticipant[];
  splitType: ExpenseSplitType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseInput {
  groupId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  paidBy: string;
  participants: ExpenseParticipant[];
  splitType: ExpenseSplitType;
}

export interface UpdateExpenseInput {
  title: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  paidBy: string;
  participants: ExpenseParticipant[];
  splitType: ExpenseSplitType;
}
