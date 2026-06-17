import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryAuthRepository } from './in-memory-auth.repository.js';
import type { GroupRepository } from '../modules/group/group.repository.js';
import type { GroupDocument, CreateGroupInput, GroupMember } from '../modules/group/group.types.js';
import type { ExpenseRepository } from '../modules/expense/expense.repository.js';
import type { ExpenseDocument, CreateExpenseInput, UpdateExpenseInput } from '../modules/expense/expense.types.js';
import type { SettlementRepository } from '../modules/settlement/settlement.repository.js';
import type { SettlementDocument, CreateSettlementInput } from '../modules/settlement/settlement.types.js';

// Self-contained in-memory repositories for integration testing
class InMemoryGroupRepository implements GroupRepository {
  private groups: GroupDocument[] = [];

  create(input: CreateGroupInput): Promise<GroupDocument> {
    const group: GroupDocument = {
      id: `group-${this.groups.length + 1}`,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.groups.push(group);
    return Promise.resolve(structuredClone(group));
  }

  findByInviteCode(inviteCode: string): Promise<GroupDocument | null> {
    const group = this.groups.find((g) => g.inviteCode === inviteCode);
    return Promise.resolve(group ? structuredClone(group) : null);
  }

  findById(id: string): Promise<GroupDocument | null> {
    const group = this.groups.find((g) => g.id === id);
    return Promise.resolve(group ? structuredClone(group) : null);
  }

  findAllByMember(userId: string): Promise<GroupDocument[]> {
    const filtered = this.groups.filter((g) => g.members.some((m) => m.userId === userId));
    return Promise.resolve(structuredClone(filtered));
  }

  addMember(groupId: string, member: GroupMember): Promise<GroupDocument> {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) throw new Error('Group not found');
    if (!group.members.some((m) => m.userId === member.userId)) {
      group.members.push(member);
    }
    return Promise.resolve(structuredClone(group));
  }

  removeMember(groupId: string, userId: string): Promise<GroupDocument | null> {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return Promise.resolve(null);
    group.members = group.members.filter((m) => m.userId !== userId);
    return Promise.resolve(structuredClone(group));
  }

  deleteById(groupId: string): Promise<void> {
    this.groups = this.groups.filter((g) => g.id !== groupId);
    return Promise.resolve();
  }
}

class InMemoryExpenseRepository implements ExpenseRepository {
  private expenses: ExpenseDocument[] = [];

  create(input: CreateExpenseInput): Promise<ExpenseDocument> {
    const expense: ExpenseDocument = {
      id: `expense-${this.expenses.length + 1}`,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.expenses.push(expense);
    return Promise.resolve(structuredClone(expense));
  }

  findById(id: string): Promise<ExpenseDocument | null> {
    const expense = this.expenses.find((e) => e.id === id);
    return Promise.resolve(expense ? structuredClone(expense) : null);
  }

  findByGroupId(groupId: string): Promise<ExpenseDocument[]> {
    const filtered = this.expenses.filter((e) => e.groupId === groupId);
    return Promise.resolve(structuredClone(filtered));
  }

  update(id: string, input: UpdateExpenseInput): Promise<ExpenseDocument> {
    const index = this.expenses.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Expense not found');
    this.expenses[index] = {
      ...this.expenses[index]!,
      ...input,
      updatedAt: new Date(),
    };
    return Promise.resolve(structuredClone(this.expenses[index]));
  }

  deleteById(id: string): Promise<void> {
    this.expenses = this.expenses.filter((e) => e.id !== id);
    return Promise.resolve();
  }

  deleteByGroupId(groupId: string): Promise<void> {
    this.expenses = this.expenses.filter((e) => e.groupId !== groupId);
    return Promise.resolve();
  }
}

class InMemorySettlementRepository implements SettlementRepository {
  private settlements: SettlementDocument[] = [];

  create(input: CreateSettlementInput): Promise<SettlementDocument> {
    const settlement: SettlementDocument = {
      id: `settlement-${this.settlements.length + 1}`,
      ...input,
      note: input.note ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.settlements.push(settlement);
    return Promise.resolve(structuredClone(settlement));
  }

  findByGroupId(groupId: string): Promise<SettlementDocument[]> {
    const filtered = this.settlements.filter((s) => s.groupId === groupId);
    return Promise.resolve(structuredClone(filtered));
  }

  deleteByGroupId(groupId: string): Promise<void> {
    this.settlements = this.settlements.filter((s) => s.groupId !== groupId);
    return Promise.resolve();
  }
}

describe('Splitwise System Integration Flow', () => {
  let app: any;
  let aliceToken = '';
  let bobToken = '';
  let charlieToken = '';
  let aliceId = '';
  let bobId = '';
  let charlieId = '';

  let groupRepository: InMemoryGroupRepository;
  let expenseRepository: InMemoryExpenseRepository;
  let settlementRepository: InMemorySettlementRepository;

  beforeAll(async () => {
    const authRepository = new InMemoryAuthRepository();
    groupRepository = new InMemoryGroupRepository();
    expenseRepository = new InMemoryExpenseRepository();
    settlementRepository = new InMemorySettlementRepository();

    app = createApp({
      clientOrigin: 'http://localhost:5173',
      environment: 'test',
      jwtAccessSecret: 'access-secret-that-is-at-least-32-characters',
      jwtRefreshSecret: 'refresh-secret-that-is-at-least-32-characters',
      authRepository,
      groupRepository,
      expenseRepository,
      settlementRepository,
    });

    // Register 3 users
    const registerAlice = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Cooper',
      email: 'alice@example.com',
      password: 'password123',
    });
    aliceToken = registerAlice.body.accessToken;
    aliceId = registerAlice.body.user.id;

    const registerBob = await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Marley',
      email: 'bob@example.com',
      password: 'password123',
    });
    bobToken = registerBob.body.accessToken;
    bobId = registerBob.body.user.id;

    const registerCharlie = await request(app).post('/api/v1/auth/register').send({
      name: 'Charlie Chaplin',
      email: 'charlie@example.com',
      password: 'password123',
    });
    charlieToken = registerCharlie.body.accessToken;
    charlieId = registerCharlie.body.user.id;
  });

  describe('1. Group Management Flow', () => {
    let inviteCode = '';
    let groupId = '';

    it('creates a group (Alice)', async () => {
      const response = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          name: 'Ski Trip',
          type: 'trip',
        });

      expect(response.status).toBe(201);
      expect(response.body.group).toHaveProperty('id');
      expect(response.body.group.name).toBe('Ski Trip');
      expect(response.body.group.createdBy).toBe(aliceId);
      expect(response.body.group.members).toHaveLength(1);
      expect(response.body.group.members[0].userId).toBe(aliceId);

      groupId = response.body.group.id;
      inviteCode = response.body.group.inviteCode;
    });

    it('allows Bob and Charlie to join group via inviteCode', async () => {
      // Bob joins
      const responseBob = await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ inviteCode });

      expect(responseBob.status).toBe(200);
      expect(responseBob.body.group.members).toHaveLength(2);

      // Charlie joins
      const responseCharlie = await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${charlieToken}`)
        .send({ inviteCode });

      expect(responseCharlie.status).toBe(200);
      expect(responseCharlie.body.group.members).toHaveLength(3);

      // Verify members list has Alice, Bob, Charlie
      const memberIds = responseCharlie.body.group.members.map((m: any) => m.userId);
      expect(memberIds).toContain(aliceId);
      expect(memberIds).toContain(bobId);
      expect(memberIds).toContain(charlieId);
    });

    it('rejects duplicate joins gracefully (idempotent)', async () => {
      const response = await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ inviteCode });

      expect(response.status).toBe(200);
      expect(response.body.group.members).toHaveLength(3);
    });

    it('allows viewing groups the user belongs to', async () => {
      const response = await request(app)
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(response.status).toBe(200);
      expect(response.body.groups).toHaveLength(1);
      expect(response.body.groups[0].id).toBe(groupId);
    });
  });

  describe('2. Expense Creation & Strict Split Validation', () => {
    let groupId = 'group-1';

    it('allows creation of a valid equal split expense for all participants', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          groupId,
          title: 'Dinner at Cabin',
          amount: 90,
          category: 'food',
          note: 'Delicious pasta',
          paidBy: aliceId,
          participants: [
            { userId: aliceId, amount: 30 },
            { userId: bobId, amount: 30 },
            { userId: charlieId, amount: 30 },
          ],
          splitType: 'equal',
        });

      expect(response.status).toBe(201);
      expect(response.body.expense.title).toBe('Dinner at Cabin');
      expect(response.body.expense.amount).toBe(90);
      expect(response.body.expense.splitType).toBe('equal');
      expect(response.body.expense.paidBy).toBe(aliceId);
      expect(response.body.expense.participants).toHaveLength(3);
    });

    it('rejects equal split expense if individual amounts are not equal (rounding tolerance exceeded)', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          groupId,
          title: 'Invalid Split Dinner',
          amount: 90,
          category: 'food',
          paidBy: aliceId,
          participants: [
            { userId: aliceId, amount: 40 },
            { userId: bobId, amount: 25 },
            { userId: charlieId, amount: 25 },
          ],
          splitType: 'equal',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SPLIT');
    });

    it('allows a subset of participants for an equal split expense', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          groupId,
          title: 'Taxi to slopes',
          amount: 30,
          category: 'travel',
          paidBy: aliceId,
          participants: [
            { userId: aliceId, amount: 15 },
            { userId: bobId, amount: 15 },
          ],
          splitType: 'equal',
        });

      expect(response.status).toBe(201);
      expect(response.body.expense.participants).toHaveLength(2);
    });

    it('allows percentage split expense if amounts and percentages match', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          groupId,
          title: 'Ski Rental',
          amount: 100,
          category: 'other',
          paidBy: aliceId,
          participants: [
            { userId: aliceId, amount: 50, percentage: 50 },
            { userId: bobId, amount: 30, percentage: 30 },
            { userId: charlieId, amount: 20, percentage: 20 },
          ],
          splitType: 'percentage',
        });

      expect(response.status).toBe(201);
      expect(response.body.expense.amount).toBe(100);
    });

    it('rejects percentage split expense if percentages sum is not 100', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          groupId,
          title: 'Ski Rental Invalid',
          amount: 100,
          category: 'other',
          paidBy: aliceId,
          participants: [
            { userId: aliceId, amount: 50, percentage: 50 },
            { userId: bobId, amount: 30, percentage: 30 },
            { userId: charlieId, amount: 10, percentage: 10 },
          ],
          splitType: 'percentage',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SPLIT');
    });

    it('rejects percentage split expense if individual amount does not match percentage share', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          groupId,
          title: 'Ski Rental Bad Share',
          amount: 100,
          category: 'other',
          paidBy: aliceId,
          participants: [
            { userId: aliceId, amount: 40, percentage: 50 },
            { userId: bobId, amount: 40, percentage: 30 },
            { userId: charlieId, amount: 20, percentage: 20 },
          ],
          splitType: 'percentage',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SPLIT');
    });

    it('rejects expense where payer is not in group', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          groupId,
          title: 'Outsider bill',
          amount: 30,
          category: 'food',
          paidBy: 'outsider-user-id',
          participants: [{ userId: aliceId, amount: 30 }],
          splitType: 'exact',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PAYER');
    });
  });

  describe('3. Balance & Settlement Calculations Flow', () => {
    let groupId = 'group-1';

    // Current state details:
    // Alice paid:
    // 1. Dinner (90) split equally Alice(30), Bob(30), Charlie(30). Alice net: +60, Bob net: -30, Charlie net: -30.
    // 2. Taxi (30) split equally Alice(15), Bob(15). Alice net: +15, Bob net: -15, Charlie net: 0.
    // 3. Rental (100) percentage split Alice(50), Bob(30), Charlie(20). Alice net: +50, Bob net: -30, Charlie net: -20.
    // Expected net balances:
    // Alice: +60 + 15 + 50 = +125.
    // Bob: -30 - 15 - 30 = -75.
    // Charlie: -30 - 0 - 20 = -50.
    // Sum: 125 - 75 - 50 = 0.

    it('calculates group balances correctly and verifies no money is lost', async () => {
      const response = await request(app)
        .get(`/api/v1/balances/group/${groupId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(200);

      const members = response.body.members;
      expect(members).toHaveLength(3);

      const aliceBal = members.find((m: any) => m.userId === aliceId);
      const bobBal = members.find((m: any) => m.userId === bobId);
      const charlieBal = members.find((m: any) => m.userId === charlieId);

      expect(aliceBal.balance).toBe(125);
      expect(bobBal.balance).toBe(-75);
      expect(charlieBal.balance).toBe(-50);

      // Verify total owed equals total lent (balance sum = 0)
      const sum = aliceBal.balance + bobBal.balance + charlieBal.balance;
      expect(sum).toBe(0);

      // Verify suggestions simplified (Bob pays Alice 75, Charlie pays Alice 50)
      expect(response.body.suggestions).toHaveLength(2);
      expect(response.body.suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fromUserId: bobId, toUserId: aliceId, amount: 75 }),
          expect.objectContaining({ fromUserId: charlieId, toUserId: aliceId, amount: 50 }),
        ]),
      );
    });

    it('records partial and full settlements and clears balances', async () => {
      // 1. Bob makes partial settlement of 40 to Alice
      const partialSettlement = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          groupId,
          toUserId: aliceId,
          amount: 40,
          note: 'Partial payback',
        });

      expect(partialSettlement.status).toBe(201);
      expect(partialSettlement.body.settlement.amount).toBe(40);
      expect(partialSettlement.body.settlement.fromUserId).toBe(bobId);
      expect(partialSettlement.body.settlement.toUserId).toBe(aliceId);

      // Check balances after partial settlement (Bob balance: -75 + 40 = -35. Alice balance: 125 - 40 = 85)
      let balResponse = await request(app)
        .get(`/api/v1/balances/group/${groupId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      let members = balResponse.body.members;
      expect(members.find((m: any) => m.userId === bobId).balance).toBe(-35);
      expect(members.find((m: any) => m.userId === aliceId).balance).toBe(85);

      // 2. Bob settles remaining 35 to Alice (Full settlement)
      const fullSettlementBob = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          groupId,
          toUserId: aliceId,
          amount: 35,
        });
      expect(fullSettlementBob.status).toBe(201);

      // 3. Charlie settles 50 to Alice (Full settlement)
      const fullSettlementCharlie = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${charlieToken}`)
        .send({
          groupId,
          toUserId: aliceId,
          amount: 50,
        });
      expect(fullSettlementCharlie.status).toBe(201);

      // Check balances after all settlements (all must be exactly 0, suggestions empty)
      balResponse = await request(app)
        .get(`/api/v1/balances/group/${groupId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      members = balResponse.body.members;
      expect(members.find((m: any) => m.userId === aliceId).balance).toBe(0);
      expect(members.find((m: any) => m.userId === bobId).balance).toBe(0);
      expect(members.find((m: any) => m.userId === charlieId).balance).toBe(0);
      expect(balResponse.body.suggestions).toHaveLength(0);
    });
  });

  describe('4. Dashboard API', () => {
    it('returns summary net balance and group list for user', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dashboard');
      expect(response.body.dashboard.summary.netBalance).toBe(0);
      expect(response.body.dashboard.groups).toHaveLength(1);
      expect(response.body.dashboard.groups[0].balance).toBe(0);
      expect(response.body.dashboard.activities.length).toBeGreaterThan(0);
    });
  });

  describe('5. Cascade Deletion Flow', () => {
    let groupId = 'group-1';

    it('verifies group contains expenses and settlements in DB', async () => {
      const expenses = await expenseRepository.findByGroupId(groupId);
      const settlements = await settlementRepository.findByGroupId(groupId);
      expect(expenses.length).toBeGreaterThan(0);
      expect(settlements.length).toBeGreaterThan(0);
    });

    it('cascade deletes related expenses and settlements when group is deleted by owner', async () => {
      const deleteResponse = await request(app)
        .delete(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(deleteResponse.status).toBe(204);

      // Verify repositories are empty for that groupId
      const expenses = await expenseRepository.findByGroupId(groupId);
      const settlements = await settlementRepository.findByGroupId(groupId);
      const group = await groupRepository.findById(groupId);

      expect(group).toBeNull();
      expect(expenses).toHaveLength(0);
      expect(settlements).toHaveLength(0);
    });
  });
});
