import { registerSchema, loginSchema } from '../modules/auth/auth.schemas.js';
import { BalanceService } from '../modules/balance/balance.service.js';
import type { ExpenseRepository } from '../modules/expense/expense.repository.js';
import { createExpenseSchema } from '../modules/expense/expense.schemas.js';
import { ExpenseService } from '../modules/expense/expense.service.js';
import type {
  CreateExpenseInput,
  ExpenseDocument,
  UpdateExpenseInput,
} from '../modules/expense/expense.types.js';
import { createGroupSchema, joinGroupSchema } from '../modules/group/group.schemas.js';
import type { GroupRepository } from '../modules/group/group.repository.js';
import { GroupService } from '../modules/group/group.service.js';
import type { CreateGroupInput, GroupDocument, GroupMember } from '../modules/group/group.types.js';
import type { SettlementRepository } from '../modules/settlement/settlement.repository.js';
import { createSettlementBodySchema } from '../modules/settlement/settlement.schemas.js';
import { SettlementService } from '../modules/settlement/settlement.service.js';
import type {
  CreateSettlementInput,
  SettlementDocument,
} from '../modules/settlement/settlement.types.js';

const alice: GroupMember = { userId: 'alice', name: 'Alice', email: 'alice@example.com' };
const bob: GroupMember = { userId: 'bob', name: 'Bob', email: 'bob@example.com' };
const chandra: GroupMember = {
  userId: 'chandra',
  name: 'Chandra',
  email: 'chandra@example.com',
};
const outsider = 'outsider';

function group(overrides: Partial<GroupDocument> = {}): GroupDocument {
  return {
    id: 'group-1',
    name: 'Weekend Trip',
    type: 'trip',
    inviteCode: 'ABC123',
    createdBy: alice.userId,
    members: [alice, bob, chandra],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function expense(overrides: Partial<ExpenseDocument> = {}): ExpenseDocument {
  return {
    id: 'expense-1',
    groupId: 'group-1',
    title: 'Dinner',
    amount: 90,
    category: 'food',
    note: '',
    paidBy: alice.userId,
    participants: [
      { userId: alice.userId, amount: 30 },
      { userId: bob.userId, amount: 30 },
      { userId: chandra.userId, amount: 30 },
    ],
    splitType: 'equal',
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function settlement(overrides: Partial<SettlementDocument> = {}): SettlementDocument {
  return {
    id: 'settlement-1',
    groupId: 'group-1',
    fromUserId: bob.userId,
    toUserId: alice.userId,
    amount: 10,
    note: '',
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    ...overrides,
  };
}

class MemoryGroupRepository implements GroupRepository {
  constructor(private readonly groups: GroupDocument[] = [group()]) {}

  create(input: CreateGroupInput): Promise<GroupDocument> {
    const created = group({ ...input, id: `group-${this.groups.length + 1}` });
    this.groups.push(created);
    return Promise.resolve(structuredClone(created));
  }

  findByInviteCode(inviteCode: string): Promise<GroupDocument | null> {
    const found = this.groups.find((candidate) => candidate.inviteCode === inviteCode);
    return Promise.resolve(found ? structuredClone(found) : null);
  }

  findById(id: string): Promise<GroupDocument | null> {
    const found = this.groups.find((candidate) => candidate.id === id);
    return Promise.resolve(found ? structuredClone(found) : null);
  }

  findAllByMember(userId: string): Promise<GroupDocument[]> {
    return Promise.resolve(
      this.groups
        .filter((candidate) => candidate.members.some((member) => member.userId === userId))
        .map((candidate) => structuredClone(candidate)),
    );
  }

  addMember(groupId: string, member: GroupMember): Promise<GroupDocument> {
    const found = this.groups.find((candidate) => candidate.id === groupId);
    if (!found) throw new Error('Group not found');
    if (!found.members.some((existing) => existing.userId === member.userId)) {
      found.members.push(member);
    }
    return Promise.resolve(structuredClone(found));
  }

  deleteById(groupId: string): Promise<void> {
    const index = this.groups.findIndex((candidate) => candidate.id === groupId);
    if (index >= 0) this.groups.splice(index, 1);
    return Promise.resolve();
  }
}

class MemoryExpenseRepository implements ExpenseRepository {
  constructor(private expenses: ExpenseDocument[] = [expense()]) {}

  create(input: CreateExpenseInput): Promise<ExpenseDocument> {
    const created = expense({ ...input, id: `expense-${this.expenses.length + 1}` });
    this.expenses.push(created);
    return Promise.resolve(structuredClone(created));
  }

  findById(id: string): Promise<ExpenseDocument | null> {
    const found = this.expenses.find((candidate) => candidate.id === id);
    return Promise.resolve(found ? structuredClone(found) : null);
  }

  findByGroupId(groupId: string): Promise<ExpenseDocument[]> {
    return Promise.resolve(
      this.expenses
        .filter((candidate) => candidate.groupId === groupId)
        .map((candidate) => structuredClone(candidate)),
    );
  }

  update(id: string, input: UpdateExpenseInput): Promise<ExpenseDocument> {
    const index = this.expenses.findIndex((candidate) => candidate.id === id);
    if (index < 0) throw new Error('Expense not found');
    this.expenses[index] = { ...this.expenses[index]!, ...input, updatedAt: new Date() };
    return Promise.resolve(structuredClone(this.expenses[index]));
  }

  deleteById(id: string): Promise<void> {
    this.expenses = this.expenses.filter((candidate) => candidate.id !== id);
    return Promise.resolve();
  }
}

class MemorySettlementRepository implements SettlementRepository {
  constructor(private readonly settlements: SettlementDocument[] = [settlement()]) {}

  create(input: CreateSettlementInput): Promise<SettlementDocument> {
    const created = settlement({
      ...input,
      id: `settlement-${this.settlements.length + 1}`,
      note: input.note ?? '',
    });
    this.settlements.push(created);
    return Promise.resolve(structuredClone(created));
  }

  findByGroupId(groupId: string): Promise<SettlementDocument[]> {
    return Promise.resolve(
      this.settlements
        .filter((candidate) => candidate.groupId === groupId)
        .map((candidate) => structuredClone(candidate)),
    );
  }
}

function services({
  groups = [group()],
  expenses = [expense()],
  settlements = [settlement()],
}: {
  groups?: GroupDocument[];
  expenses?: ExpenseDocument[];
  settlements?: SettlementDocument[];
} = {}) {
  const groupRepository = new MemoryGroupRepository(groups);
  const expenseRepository = new MemoryExpenseRepository(expenses);
  const settlementRepository = new MemorySettlementRepository(settlements);
  const groupService = new GroupService(groupRepository);

  return {
    groupService,
    expenseService: new ExpenseService(expenseRepository, groupService),
    balanceService: new BalanceService(expenseRepository, settlementRepository, groupRepository),
    settlementService: new SettlementService(settlementRepository, groupService),
  };
}

describe('QA authentication checks', () => {
  it.each([
    [
      'accepts valid registration',
      registerSchema,
      { name: ' Alice ', email: 'ALICE@example.com', password: 'strong-password' },
      true,
    ],
    [
      'rejects registration with invalid email',
      registerSchema,
      { name: 'Alice', email: 'bad', password: 'strong-password' },
      false,
    ],
    [
      'rejects registration with short password',
      registerSchema,
      { name: 'Alice', email: 'alice@example.com', password: 'short' },
      false,
    ],
    [
      'rejects registration with blank trimmed name',
      registerSchema,
      { name: '   ', email: 'alice@example.com', password: 'strong-password' },
      false,
    ],
    [
      'rejects registration with too long password',
      registerSchema,
      { name: 'Alice', email: 'alice@example.com', password: 'a'.repeat(73) },
      false,
    ],
    ['accepts valid login', loginSchema, { email: ' alice@example.com ', password: 'x' }, true],
    [
      'rejects login with empty password',
      loginSchema,
      { email: 'alice@example.com', password: '' },
      false,
    ],
    [
      'rejects login with malformed email',
      loginSchema,
      { email: 'alice', password: 'strong-password' },
      false,
    ],
  ])('%s', (_name, schema, input, expected) => {
    expect(schema.safeParse(input).success).toBe(expected);
  });
});

describe('QA group checks', () => {
  it.each([
    ['accepts valid group creation', createGroupSchema, { name: 'Trip', type: 'trip' }, true],
    ['rejects short group name', createGroupSchema, { name: 'AB', type: 'trip' }, false],
    ['rejects unsupported group type', createGroupSchema, { name: 'Trip', type: 'invalid' }, false],
    ['accepts six character invite code', joinGroupSchema, { inviteCode: 'ABC123' }, true],
    ['rejects short invite code', joinGroupSchema, { inviteCode: 'ABC12' }, false],
  ])('%s', (_name, schema, input, expected) => {
    expect(schema.safeParse(input).success).toBe(expected);
  });

  it('does not duplicate a user joining the same group twice', async () => {
    const { groupService } = services();
    const joined = await groupService.joinGroup('ABC123', alice);
    expect(joined.members.filter((member) => member.userId === alice.userId)).toHaveLength(1);
  });

  it('rejects unknown invite codes', async () => {
    const { groupService } = services();
    await expect(groupService.joinGroup('ZZZ999', alice)).rejects.toMatchObject({
      statusCode: 404,
      code: 'GROUP_NOT_FOUND',
    });
  });

  it('returns only groups where the user is a member', async () => {
    const { groupService } = services({
      groups: [group({ id: 'group-1' }), group({ id: 'group-2', members: [bob] })],
    });
    await expect(groupService.getGroupsForUser(alice.userId)).resolves.toHaveLength(1);
  });

  it('rejects deleting a group by a non-owner', async () => {
    const { groupService } = services();
    await expect(groupService.deleteGroup('group-1', bob.userId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('allows the owner to delete a group', async () => {
    const { groupService } = services();
    await expect(groupService.deleteGroup('group-1', alice.userId)).resolves.toBeUndefined();
  });
});

describe('QA expense checks', () => {
  const validExpense: CreateExpenseInput = {
    groupId: 'group-1',
    title: 'Tickets',
    amount: 90,
    category: 'travel',
    note: '',
    paidBy: alice.userId,
    participants: [
      { userId: alice.userId, amount: 30 },
      { userId: bob.userId, amount: 30 },
      { userId: chandra.userId, amount: 30 },
    ],
    splitType: 'equal',
  };

  it.each([
    ['rejects zero amount', { ...validExpense, amount: 0 }],
    ['rejects negative amount', { ...validExpense, amount: -1 }],
    ['rejects blank title', { ...validExpense, title: '   ' }],
    ['rejects too long note', { ...validExpense, note: 'a'.repeat(301) }],
  ])('%s at schema level', (_name, input) => {
    expect(createExpenseSchema.safeParse(input).success).toBe(false);
  });

  it('creates a valid equal split expense', async () => {
    const { expenseService } = services();
    await expect(expenseService.createExpense(alice.userId, validExpense)).resolves.toMatchObject({
      title: 'Tickets',
      amount: 90,
    });
  });

  it('rejects expense creation by a non-member', async () => {
    const { expenseService } = services();
    await expect(expenseService.createExpense(outsider, validExpense)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects a payer who is not a group member', async () => {
    const { expenseService } = services();
    await expect(
      expenseService.createExpense(alice.userId, { ...validExpense, paidBy: outsider }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PAYER' });
  });

  it('rejects a participant who is not a group member', async () => {
    const { expenseService } = services();
    await expect(
      expenseService.createExpense(alice.userId, {
        ...validExpense,
        participants: [{ userId: outsider, amount: 90 }],
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PARTICIPANT' });
  });

  it('rejects duplicate participants', async () => {
    const { expenseService } = services();
    await expect(
      expenseService.createExpense(alice.userId, {
        ...validExpense,
        participants: [
          { userId: alice.userId, amount: 45 },
          { userId: alice.userId, amount: 45 },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'DUPLICATE_PARTICIPANTS' });
  });

  it('rejects participant totals that do not match the expense amount', async () => {
    const { expenseService } = services();
    await expect(
      expenseService.createExpense(alice.userId, {
        ...validExpense,
        participants: [{ userId: alice.userId, amount: 89 }],
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_SPLIT' });
  });

  it('accepts one-cent rounding tolerance', async () => {
    const { expenseService } = services();
    await expect(
      expenseService.createExpense(alice.userId, {
        ...validExpense,
        amount: 100,
        participants: [
          { userId: alice.userId, amount: 33.33 },
          { userId: bob.userId, amount: 33.33 },
          { userId: chandra.userId, amount: 33.33 },
        ],
      }),
    ).resolves.toMatchObject({ amount: 100 });
  });

  it('rejects percentage split without percentages', async () => {
    const { expenseService } = services();
    await expect(
      expenseService.createExpense(alice.userId, { ...validExpense, splitType: 'percentage' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_SPLIT' });
  });

  it('rejects percentage split that does not total 100', async () => {
    const { expenseService } = services();
    await expect(
      expenseService.createExpense(alice.userId, {
        ...validExpense,
        splitType: 'percentage',
        participants: [
          { userId: alice.userId, amount: 30, percentage: 30 },
          { userId: bob.userId, amount: 30, percentage: 30 },
          { userId: chandra.userId, amount: 30, percentage: 30 },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_SPLIT' });
  });

  it('rejects non-member expense list reads', async () => {
    const { expenseService } = services();
    await expect(expenseService.getExpensesByGroup('group-1', outsider)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects non-member expense update', async () => {
    const { expenseService } = services();
    await expect(
      expenseService.updateExpense('expense-1', outsider, validExpense),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('rejects non-member expense delete', async () => {
    const { expenseService } = services();
    await expect(expenseService.deleteExpense('expense-1', outsider)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });
});

describe('QA balance and debt simplification checks', () => {
  it('returns zero balances for a group with no expenses or settlements', async () => {
    const { balanceService } = services({ expenses: [], settlements: [] });
    const balance = await balanceService.getGroupBalance('group-1', alice.userId);
    expect(balance.members.every((member) => member.balance === 0)).toBe(true);
    expect(balance.suggestions).toEqual([]);
  });

  it('calculates who owes after one member pays for everyone', async () => {
    const { balanceService } = services({ settlements: [] });
    const balance = await balanceService.getGroupBalance('group-1', bob.userId);
    expect(balance.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: alice.userId, balance: 60 }),
        expect.objectContaining({ userId: bob.userId, balance: -30 }),
        expect.objectContaining({ userId: chandra.userId, balance: -30 }),
      ]),
    );
  });

  it('applies settlements to balances', async () => {
    const { balanceService } = services();
    const balance = await balanceService.getGroupBalance('group-1', alice.userId);
    expect(balance.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: alice.userId, balance: 50 }),
        expect.objectContaining({ userId: bob.userId, balance: -20 }),
      ]),
    );
  });

  it('rejects balance reads by non-members', async () => {
    const { balanceService } = services();
    await expect(balanceService.getGroupBalance('group-1', outsider)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('returns settlement history in balance output', async () => {
    const { balanceService } = services();
    const balance = await balanceService.getGroupBalance('group-1', alice.userId);
    expect(balance.history).toHaveLength(1);
    expect(balance.history[0]).toMatchObject({ fromUserId: bob.userId, toUserId: alice.userId });
  });

  it('simplifies debt into minimum payments for one creditor', async () => {
    const { balanceService } = services({ settlements: [] });
    const balance = await balanceService.getGroupBalance('group-1', alice.userId);
    expect(balance.suggestions).toEqual([
      expect.objectContaining({ fromUserId: bob.userId, toUserId: alice.userId, amount: 30 }),
      expect.objectContaining({ fromUserId: chandra.userId, toUserId: alice.userId, amount: 30 }),
    ]);
  });

  it('does not generate suggestions when everyone is settled', async () => {
    const { balanceService } = services({
      expenses: [expense({ amount: 0.03, participants: [{ userId: alice.userId, amount: 0.03 }] })],
      settlements: [],
    });
    const balance = await balanceService.getGroupBalance('group-1', alice.userId);
    expect(balance.suggestions).toEqual([]);
  });

  it('keeps total expenses and settlements separate', async () => {
    const { balanceService } = services();
    const balance = await balanceService.getGroupBalance('group-1', alice.userId);
    expect(balance.totalExpenses).toBe(90);
    expect(balance.totalSettled).toBe(10);
  });
});

describe('QA settlement checks', () => {
  it.each([
    [
      'accepts valid settlement body',
      { groupId: 'group-1', toUserId: bob.userId, amount: 10 },
      true,
    ],
    [
      'rejects zero settlement amount',
      { groupId: 'group-1', toUserId: bob.userId, amount: 0 },
      false,
    ],
    ['rejects missing recipient', { groupId: 'group-1', toUserId: '', amount: 10 }, false],
    [
      'rejects long settlement note',
      { groupId: 'group-1', toUserId: bob.userId, amount: 10, note: 'a'.repeat(257) },
      false,
    ],
  ])('%s at schema level', (_name, input, expected) => {
    expect(createSettlementBodySchema.safeParse(input).success).toBe(expected);
  });

  it('rejects settlement to self', async () => {
    const { settlementService } = services();
    await expect(
      settlementService.createSettlement(alice.userId, {
        groupId: 'group-1',
        toUserId: alice.userId,
        amount: 10,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RECIPIENT' });
  });

  it('rejects settlement by non-member', async () => {
    const { settlementService } = services();
    await expect(
      settlementService.createSettlement(outsider, {
        groupId: 'group-1',
        toUserId: alice.userId,
        amount: 10,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('rejects settlement to non-member recipient', async () => {
    const { settlementService } = services();
    await expect(
      settlementService.createSettlement(alice.userId, {
        groupId: 'group-1',
        toUserId: outsider,
        amount: 10,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RECIPIENT' });
  });

  it('trims settlement note before saving', async () => {
    const { settlementService } = services();
    await expect(
      settlementService.createSettlement(alice.userId, {
        groupId: 'group-1',
        toUserId: bob.userId,
        amount: 10,
        note: '  paid back  ',
      }),
    ).resolves.toMatchObject({ note: 'paid back' });
  });
});
