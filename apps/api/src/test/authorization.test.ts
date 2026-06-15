import { BalanceService } from '../modules/balance/balance.service.js';
import type { ExpenseRepository } from '../modules/expense/expense.repository.js';
import { ExpenseService } from '../modules/expense/expense.service.js';
import type {
  CreateExpenseInput,
  ExpenseDocument,
  UpdateExpenseInput,
} from '../modules/expense/expense.types.js';
import type { GroupRepository } from '../modules/group/group.repository.js';
import { GroupService } from '../modules/group/group.service.js';
import type { CreateGroupInput, GroupDocument, GroupMember } from '../modules/group/group.types.js';
import type { SettlementRepository } from '../modules/settlement/settlement.repository.js';
import type {
  CreateSettlementInput,
  SettlementDocument,
} from '../modules/settlement/settlement.types.js';

const alice: GroupMember = { userId: 'user-alice', name: 'Alice', email: 'alice@example.com' };
const bob: GroupMember = { userId: 'user-bob', name: 'Bob', email: 'bob@example.com' };
const outsider = 'user-outsider';

function createGroup(): GroupDocument {
  return {
    id: 'group-1',
    name: 'Trip',
    type: 'trip',
    inviteCode: 'ABC123',
    createdBy: alice.userId,
    members: [alice, bob],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class TestGroupRepository implements GroupRepository {
  private readonly group = createGroup();

  create(input: CreateGroupInput): Promise<GroupDocument> {
    return Promise.resolve({ ...this.group, ...input, id: this.group.id });
  }

  findByInviteCode(inviteCode: string): Promise<GroupDocument | null> {
    return Promise.resolve(
      inviteCode === this.group.inviteCode ? structuredClone(this.group) : null,
    );
  }

  findById(id: string): Promise<GroupDocument | null> {
    return Promise.resolve(id === this.group.id ? structuredClone(this.group) : null);
  }

  findAllByMember(userId: string): Promise<GroupDocument[]> {
    return Promise.resolve(
      this.group.members.some((member) => member.userId === userId)
        ? [structuredClone(this.group)]
        : [],
    );
  }

  addMember(_groupId: string, member: GroupMember): Promise<GroupDocument> {
    return Promise.resolve({ ...this.group, members: [...this.group.members, member] });
  }

  deleteById(): Promise<void> {
    return Promise.resolve();
  }
}

class TestExpenseRepository implements ExpenseRepository {
  private expense: ExpenseDocument | null = {
    id: 'expense-1',
    groupId: 'group-1',
    title: 'Dinner',
    amount: 100,
    category: 'food',
    note: '',
    paidBy: alice.userId,
    participants: [
      { userId: alice.userId, amount: 50 },
      { userId: bob.userId, amount: 50 },
    ],
    splitType: 'equal',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  create(input: CreateExpenseInput): Promise<ExpenseDocument> {
    this.expense = { ...input, id: 'expense-2', createdAt: new Date(), updatedAt: new Date() };
    return Promise.resolve(structuredClone(this.expense));
  }

  findById(id: string): Promise<ExpenseDocument | null> {
    return Promise.resolve(this.expense?.id === id ? structuredClone(this.expense) : null);
  }

  findByGroupId(groupId: string): Promise<ExpenseDocument[]> {
    return Promise.resolve(
      this.expense?.groupId === groupId ? [structuredClone(this.expense)] : [],
    );
  }

  update(_id: string, input: UpdateExpenseInput): Promise<ExpenseDocument> {
    this.expense = { ...this.expense!, ...input, updatedAt: new Date() };
    return Promise.resolve(structuredClone(this.expense));
  }

  deleteById(): Promise<void> {
    this.expense = null;
    return Promise.resolve();
  }
}

class TestSettlementRepository implements SettlementRepository {
  create(input: CreateSettlementInput): Promise<SettlementDocument> {
    return Promise.resolve({
      ...input,
      id: 'settlement-1',
      note: input.note ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  findByGroupId(): Promise<SettlementDocument[]> {
    return Promise.resolve([]);
  }
}

function createServices() {
  const groupRepository = new TestGroupRepository();
  const groupService = new GroupService(groupRepository);
  const expenseRepository = new TestExpenseRepository();
  const settlementRepository = new TestSettlementRepository();

  return {
    groupService,
    expenseService: new ExpenseService(expenseRepository, groupService),
    balanceService: new BalanceService(expenseRepository, settlementRepository, groupRepository),
  };
}

describe('object authorization', () => {
  it('rejects group details for non-members', async () => {
    const { groupService } = createServices();

    await expect(groupService.getGroupForMember('group-1', outsider)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects expense reads for non-members', async () => {
    const { expenseService } = createServices();

    await expect(expenseService.getExpenseById('expense-1', outsider)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects balance reads for non-members', async () => {
    const { balanceService } = createServices();

    await expect(balanceService.getGroupBalance('group-1', outsider)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });
});

describe('expense validation', () => {
  it('rejects participant totals that do not match the expense amount', async () => {
    const { expenseService } = createServices();

    await expect(
      expenseService.createExpense(alice.userId, {
        groupId: 'group-1',
        title: 'Tickets',
        amount: 100,
        category: 'travel',
        note: '',
        paidBy: alice.userId,
        participants: [
          { userId: alice.userId, amount: 40 },
          { userId: bob.userId, amount: 40 },
        ],
        splitType: 'exact',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_SPLIT',
    });
  });
});
