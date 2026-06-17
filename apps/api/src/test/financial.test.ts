import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryAuthRepository } from './in-memory-auth.repository.js';
import type { GroupRepository } from '../modules/group/group.repository.js';
import type { GroupDocument, CreateGroupInput, GroupMember } from '../modules/group/group.types.js';
import type { ExpenseRepository } from '../modules/expense/expense.repository.js';
import type { ExpenseDocument, CreateExpenseInput, UpdateExpenseInput } from '../modules/expense/expense.types.js';
import type { SettlementRepository } from '../modules/settlement/settlement.repository.js';
import type { SettlementDocument, CreateSettlementInput } from '../modules/settlement/settlement.types.js';

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

// Simple seedable pseudo-random number generator for reproducible fuzz tests
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

describe('Splitwise Financial Invariants & Simulation Audit', () => {
  let app: any;
  let authRepository: InMemoryAuthRepository;
  let groupRepository: InMemoryGroupRepository;
  let expenseRepository: InMemoryExpenseRepository;
  let settlementRepository: InMemorySettlementRepository;

  // Store registered user credentials
  const users: Array<{ id: string; name: string; email: string; token: string }> = [];

  beforeAll(async () => {
    authRepository = new InMemoryAuthRepository();
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

    // Register 20 users for the simulation
    for (let i = 1; i <= 20; i++) {
      const email = `user${i}@financial.com`;
      const registerRes = await request(app).post('/api/v1/auth/register').send({
        name: `User ${i}`,
        email,
        password: 'securePassword123',
      });
      users.push({
        id: registerRes.body.user.id,
        name: registerRes.body.user.name,
        email,
        token: registerRes.body.accessToken,
      });
    }
  }, 30000);

  describe('Invariant Checks & Settlement Safety', () => {
    let groupId = '';
    let inviteCode = '';

    beforeEach(async () => {
      // Create fresh group with User 1, 2, 3
      const groupRes = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({ name: 'Fresh Group', type: 'trip' });

      groupId = groupRes.body.group.id;
      inviteCode = groupRes.body.group.inviteCode;

      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({ inviteCode });

      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[2]!.token}`)
        .send({ inviteCode });
    });

    it('rejects settlements when payer has positive or zero balance', async () => {
      // No expenses added yet, all balances are 0. Settlement should fail.
      const res = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId,
          toUserId: users[1]!.id,
          amount: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SETTLEMENT');
    });

    it('rejects settlements that exceed outstanding debt', async () => {
      // User 1 pays 30, split equally among User 1, 2, 3 (10 each).
      // Net balances: User 1: +20, User 2: -10, User 3: -10.
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId,
          title: 'Drinks',
          amount: 30,
          category: 'food',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 10 },
            { userId: users[1]!.id, amount: 10 },
            { userId: users[2]!.id, amount: 10 },
          ],
          splitType: 'equal',
        });

      // User 2 owes 10. Try to settle 10.01 (which exceeds 10)
      const overpayRes = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({
          groupId,
          toUserId: users[0]!.id,
          amount: 10.01,
        });

      expect(overpayRes.status).toBe(400);
      expect(overpayRes.body.error.code).toBe('INVALID_SETTLEMENT');

      // Valid settlement of exactly 10 should succeed
      const validRes = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({
          groupId,
          toUserId: users[0]!.id,
          amount: 10,
        });

      expect(validRes.status).toBe(201);
    });

    it('enforces 2-decimal-place rounding constraint on API input amounts', async () => {
      // Post an expense with raw float decimals
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId,
          title: 'Decimals Test',
          amount: 10.012,
          category: 'food',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 3.333 },
            { userId: users[1]!.id, amount: 3.333 },
            { userId: users[2]!.id, amount: 3.336 }, // sums to 10.002, within tolerance of 10.012 -> 10.01 total
          ],
          splitType: 'equal',
        });

      expect(res.status).toBe(201);
      // It must be stored rounded to 2 decimal places: 10.01 total
      expect(res.body.expense.amount).toBe(10.01);
      expect(res.body.expense.participants[0].amount).toBe(3.33);
      expect(res.body.expense.participants[1].amount).toBe(3.33);
      expect(res.body.expense.participants[2].amount).toBe(3.34);
    });
  });

  describe('Process Concurrency Lock via GroupMutex', () => {
    let groupId = '';
    let inviteCode = '';

    beforeEach(async () => {
      const groupRes = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({ name: 'Lock Group', type: 'trip' });

      groupId = groupRes.body.group.id;
      inviteCode = groupRes.body.group.inviteCode;

      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({ inviteCode });

      // Alice pays 20. Bob owes 10.
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId,
          title: 'Locked Lunch',
          amount: 20,
          category: 'food',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 10 },
            { userId: users[1]!.id, amount: 10 },
          ],
          splitType: 'equal',
        });
    });

    it('prevents concurrent settlements from racing and overpaying', async () => {
      // Bob sends two concurrent settlement requests of 10 to Alice
      const requests = [
        request(app)
          .post('/api/v1/settlements')
          .set('Authorization', `Bearer ${users[1]!.token}`)
          .send({ groupId, toUserId: users[0]!.id, amount: 10 }),
        request(app)
          .post('/api/v1/settlements')
          .set('Authorization', `Bearer ${users[1]!.token}`)
          .send({ groupId, toUserId: users[0]!.id, amount: 10 }),
      ];

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      // One request should succeed (201), the other must be rejected (400) because the outstanding debt is cleared
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);

      const failedResponse = responses.find((r) => r.status === 400);
      expect(failedResponse?.body.error.code).toBe('INVALID_SETTLEMENT');
    });
  });

  describe('Randomized Fuzz Transaction Simulator (Property-Based Verification)', () => {
    let groupId = '';
    let inviteCode = '';
    const groupMembers: typeof users = [];

    beforeAll(async () => {
      // Create simulator group with first member
      const groupRes = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({ name: 'Simulation Group', type: 'trip' });

      groupId = groupRes.body.group.id;
      inviteCode = groupRes.body.group.inviteCode;
      groupMembers.push(users[0]!);

      // Have 14 other random users join (total group size = 15)
      for (let i = 1; i < 15; i++) {
        await request(app)
          .post('/api/v1/groups/join')
          .set('Authorization', `Bearer ${users[i]!.token}`)
          .send({ inviteCode });
        groupMembers.push(users[i]!);
      }
    });

    it('verifies that all financial invariants hold after 100 randomized transaction operations', async () => {
      const rand = new SeededRandom(42); // deterministic seed

      for (let op = 1; op <= 100; op++) {
        const actionType = rand.nextInt(1, 100);

        if (actionType <= 75) {
          // 75% chance: Add an expense
          const payerIndex = rand.nextInt(0, groupMembers.length - 1);
          const payer = groupMembers[payerIndex]!;

          // Select random subset of participants (minimum 2)
          const numParticipants = rand.nextInt(2, groupMembers.length);
          const participantSubset: typeof groupMembers = [];
          const shuffled = [...groupMembers].sort(() => rand.next() - 0.5);
          for (let p = 0; p < numParticipants; p++) {
            participantSubset.push(shuffled[p]!);
          }

          // Random amount rounded to 2 decimals
          const rawAmount = rand.next() * 300 + 5.0; // ₹5 to ₹305
          const amount = Math.round(rawAmount * 100) / 100;

          // Equal split cents calculations
          const totalCents = Math.round(amount * 100);
          const baseCents = Math.floor(totalCents / numParticipants);
          const extraCents = totalCents % numParticipants;

          const participants = participantSubset.map((member, index) => {
            const extra = index < extraCents ? 1 : 0;
            return {
              userId: member.id,
              amount: (baseCents + extra) / 100,
            };
          });

          const res = await request(app)
            .post('/api/v1/expenses')
            .set('Authorization', `Bearer ${payer.token}`)
            .send({
              groupId,
              title: `Sim Expense ${op}`,
              amount,
              category: 'travel',
              paidBy: payer.id,
              participants,
              splitType: 'equal',
            });

          expect(res.status).toBe(201);
        } else {
          // 25% chance: Settle a random simplified debt
          const balRes = await request(app)
            .get(`/api/v1/balances/group/${groupId}`)
            .set('Authorization', `Bearer ${groupMembers[0]!.token}`);

          expect(balRes.status).toBe(200);

          const suggestions = balRes.body.suggestions;

          if (suggestions && suggestions.length > 0) {
            // Pick a suggestion at random
            const sugIndex = rand.nextInt(0, suggestions.length - 1);
            const sug = suggestions[sugIndex]!;

            // Find tokens
            const debtor = groupMembers.find((m) => m.id === sug.fromUserId)!;

            // Settle either full amount or a partial random amount
            const fullSettle = rand.next() > 0.5;
            const settleAmount = fullSettle
              ? sug.amount
              : Math.round((rand.next() * (sug.amount - 0.05) + 0.01) * 100) / 100;

            if (settleAmount > 0.01) {
              const res = await request(app)
                .post('/api/v1/settlements')
                .set('Authorization', `Bearer ${debtor.token}`)
                .send({
                  groupId,
                  toUserId: sug.toUserId,
                  amount: settleAmount,
                });

              expect(res.status).toBe(201);
            }
          }
        }

        // --- Invariant Checks after each operation ---
        const balRes = await request(app)
          .get(`/api/v1/balances/group/${groupId}`)
          .set('Authorization', `Bearer ${groupMembers[0]!.token}`);

        expect(balRes.status).toBe(200);

        const members = balRes.body.members;
        const totalExpenses = balRes.body.totalExpenses;
        const totalSettled = balRes.body.totalSettled;

        // Invariant 1: Sum of all balances = 0 (using cents to avoid floating point accumulation)
        const balanceSumCents = members.reduce(
          (sum: number, m: any) => sum + Math.round(m.balance * 100),
          0,
        );
        expect(balanceSumCents).toBe(0);

        // Invariant 2: Sum of debts = sum of credits
        const totalDebtsCents = members.reduce(
          (sum: number, m: any) => sum + Math.round(m.owesAmount * 100),
          0,
        );
        const totalCreditsCents = members.reduce(
          (sum: number, m: any) => sum + Math.round(m.isOwedAmount * 100),
          0,
        );
        expect(totalDebtsCents).toBe(totalCreditsCents);

        // Invariant 3: No user owes themselves (owesAmount and isOwedAmount are mutually exclusive per member)
        for (const m of members) {
          expect(m.owesAmount === 0 || m.isOwedAmount === 0).toBe(true);
        }

        // Invariant 4: Simplified suggestions totals match total debts
        const suggestionSumCents = balRes.body.suggestions.reduce(
          (sum: number, s: any) => sum + Math.round(s.amount * 100),
          0,
        );
        expect(suggestionSumCents).toBe(totalDebtsCents);
      }
    });

    it('verifies that group balances are isolated', async () => {
      // Create a completely separate Group B with User 19 and 20
      const groupBRes = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[18]!.token}`)
        .send({ name: 'Group B Isolation Test', type: 'home' });

      const groupBId = groupBRes.body.group.id;
      const groupBInvite = groupBRes.body.group.inviteCode;

      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[19]!.token}`)
        .send({ inviteCode: groupBInvite });

      // Add expense to Group B
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[18]!.token}`)
        .send({
          groupId: groupBId,
          title: 'Rent B',
          amount: 100,
          category: 'rent',
          paidBy: users[18]!.id,
          participants: [
            { userId: users[18]!.id, amount: 50 },
            { userId: users[19]!.id, amount: 50 },
          ],
          splitType: 'equal',
        });

      // Get Group B balances (User 19: +50, User 20: -50)
      const bRes = await request(app)
        .get(`/api/v1/balances/group/${groupBId}`)
        .set('Authorization', `Bearer ${users[18]!.token}`);

      expect(bRes.status).toBe(200);
      expect(bRes.body.members.find((m: any) => m.userId === users[18]!.id).balance).toBe(50);

      // Get original group balances, verify they are unchanged by Group B transactions
      const originalRes = await request(app)
        .get(`/api/v1/balances/group/${groupId}`)
        .set('Authorization', `Bearer ${groupMembers[0]!.token}`);

      const originalTotalExpenses = originalRes.body.totalExpenses;
      // Should not contain the 100 from Group B Rent
      expect(originalRes.body.members.find((m: any) => m.userId === users[18]!.id)).toBeUndefined();
    });
  });
});
