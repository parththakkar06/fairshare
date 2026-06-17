export function calculateBalances(
  members: string[],
  expenses: Array<{ paidBy: string; amount: number; participants: Array<{ userId: string; amount: number }> }>,
  settlements: Array<{ fromUserId: string; toUserId: string; amount: number }>,
): Map<string, number> {
  const balances = new Map<string, number>();
  members.forEach((m) => balances.set(m, 0));

  expenses.forEach((expense) => {
    const p = balances.get(expense.paidBy) ?? 0;
    balances.set(expense.paidBy, p + expense.amount);

    expense.participants.forEach((part) => {
      const current = balances.get(part.userId) ?? 0;
      balances.set(part.userId, current - part.amount);
    });
  });

  settlements.forEach((settlement) => {
    const fromVal = balances.get(settlement.fromUserId) ?? 0;
    const toVal = balances.get(settlement.toUserId) ?? 0;
    balances.set(settlement.fromUserId, fromVal + settlement.amount);
    balances.set(settlement.toUserId, toVal - settlement.amount);
  });

  return balances;
}
