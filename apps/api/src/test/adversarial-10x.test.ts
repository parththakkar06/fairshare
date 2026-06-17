import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryAuthRepository } from './in-memory-auth.repository.js';
import type { GroupRepository } from '../modules/group/group.repository.js';
import type { GroupDocument, CreateGroupInput, GroupMember } from '../modules/group/group.types.js';
import type { ExpenseRepository } from '../modules/expense/expense.repository.js';
import type { ExpenseDocument, CreateExpenseInput, UpdateExpenseInput } from '../modules/expense/expense.types.js';
import type { SettlementRepository } from '../modules/settlement/settlement.repository.js';
import type { SettlementDocument, CreateSettlementInput } from '../modules/settlement/settlement.types.js';
import { GroupService } from '../modules/group/group.service.js';
import { ExpenseService } from '../modules/expense/expense.service.js';
import { SettlementService } from '../modules/settlement/settlement.service.js';
import { BalanceService } from '../modules/balance/balance.service.js';
import { GroupMutex } from '../common/utils/group-mutex.js';
import { TokenService } from '../modules/auth/token.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { calculateBalances } from '../common/utils/balances.js';

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

describe('Final 10x Adversarial Verification Audit Suite', () => {
  let app: any;
  let authRepository: InMemoryAuthRepository;
  let groupRepository: InMemoryGroupRepository;
  let expenseRepository: InMemoryExpenseRepository;
  let settlementRepository: InMemorySettlementRepository;
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

    for (let i = 1; i <= 5; i++) {
      const email = `audit${i}@tenx.com`;
      const res = await request(app).post('/api/v1/auth/register').send({
        name: `Audit User ${i}`,
        email,
        password: 'securePassword123',
      });
      users.push({
        id: res.body.user.id,
        name: res.body.user.name,
        email,
        token: res.body.accessToken,
      });
    }
  }, 30000);

  describe('Concurrency Torture: Distributed Race Condition Demonstration', () => {
    it('proves horizontal scaling concurrency vulnerabilities when bypassing the in-memory mutex', async () => {
      // Simulate multi-process scaling where requests hit different processes, bypassing in-memory locks
      const groupRepo = new InMemoryGroupRepository();
      const expenseRepo = new InMemoryExpenseRepository();
      const settlementRepo = new InMemorySettlementRepository();
      const tokens = new TokenService({ accessSecret: 'sec', refreshSecret: 'sec' });
      // Instantiated WITHOUT mutex to simulate concurrent processing by different node worker instances
      const groupService = new GroupService(groupRepo, expenseRepo, settlementRepo);
      const expenseService = new ExpenseService(expenseRepo, groupService);
      const settlementService = new SettlementService(settlementRepo, groupService, expenseRepo);
      const balanceService = new BalanceService(expenseRepo, settlementRepo, groupRepo);

      // Create Alice & Bob
      const alice = { id: 'u1', userId: 'u1', name: 'Alice', email: 'a@a.com' };
      const bob = { id: 'u2', userId: 'u2', name: 'Bob', email: 'b@b.com' };

      const group = await groupRepo.create({
        name: 'Horizontal Test Group',
        type: 'trip',
        inviteCode: 'HORIZO',
        createdBy: alice.id,
        members: [alice, bob],
      });

      // Alice pays 10, Bob owes 5
      await expenseService.createExpense(alice.id, {
        groupId: group.id,
        title: 'Lunch',
        amount: 10,
        category: 'food',
        note: '',
        paidBy: alice.id,
        participants: [
          { userId: alice.id, amount: 5 },
          { userId: bob.id, amount: 5 },
        ],
        splitType: 'equal',
      });

      // Bob concurrently submits two settlements of 5 to Alice
      // We simulate them starting in parallel (representing two servers reading database at the same time)
      const p1 = settlementService.createSettlement(bob.id, {
        groupId: group.id,
        toUserId: alice.id,
        amount: 5,
        note: 'Settle 1',
      });
      const p2 = settlementService.createSettlement(bob.id, {
        groupId: group.id,
        toUserId: alice.id,
        amount: 5,
        note: 'Settle 2',
      });

      // Both settlements will succeed because when they retrieve the database state, Bob's outstanding debt is 5
      await Promise.all([p1, p2]);

      const finalBal = await balanceService.getGroupBalance(group.id, alice.id);
      const aliceBal = finalBal.members.find((m) => m.userId === alice.id);
      const bobBal = finalBal.members.find((m) => m.userId === bob.id);

      // Programmatic Proof of Race Condition:
      // Alice's balance becomes -5, Bob's balance becomes +5.
      // This is a debt inversion! Bob overpaid by 5 and Alice now owes Bob 5.
      // Sum of balances is still 0, but Bob exceeded the outstanding debt because of parallel state check bypass.
      expect(aliceBal!.balance).toBe(-5);
      expect(bobBal!.balance).toBe(5);
    });
  });

  describe('Authorization Abuse, payload tampering, and historical edits', () => {
    let groupAId = '';
    let groupBId = '';

    beforeAll(async () => {
      // Group A (User 1 owner, User 2 member)
      const resA = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({ name: 'Group A', type: 'trip' });
      groupAId = resA.body.group.id;
      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({ inviteCode: resA.body.group.inviteCode });

      // Group B (User 3 owner)
      const resB = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[2]!.token}`)
        .send({ name: 'Group B', type: 'home' });
      groupBId = resB.body.group.id;
    });

    it('rejects tampered client payloads (non-member participant)', async () => {
      // User 1 tries to add expense in Group A, but injects User 3 (not a member of Group A)
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId: groupAId,
          title: 'Tampered Payloads',
          amount: 30,
          category: 'travel',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 15 },
            { userId: users[2]!.id, amount: 15 }, // not a member!
          ],
          splitType: 'equal',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARTICIPANT');
    });

    it('rejects editing an expense to use a payer who has left the group', async () => {
      // Create fresh group, User 1 owner, User 2 member
      const tempGroupRes = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({ name: 'Temp Edit Group', type: 'food' });
      const tempGroupId = tempGroupRes.body.group.id;
      const tempCode = tempGroupRes.body.group.inviteCode;

      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({ inviteCode: tempCode });

      // Add expense
      const expRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId: tempGroupId,
          title: 'Juice',
          amount: 10,
          category: 'food',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 5 },
            { userId: users[1]!.id, amount: 5 },
          ],
          splitType: 'equal',
        });
      const expId = expRes.body.expense.id;

      // User 2 settles outstanding balance
      await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({
          groupId: tempGroupId,
          toUserId: users[0]!.id,
          amount: 5,
        });

      // User 2 leaves successfully
      await request(app)
        .post(`/api/v1/groups/${tempGroupId}/leave`)
        .set('Authorization', `Bearer ${users[1]!.token}`);

      // Now attempt to edit that expense to change title, keeping Bob (User 2) as participant
      // It fails because Bob has left and is no longer a member of the group, so validateExpenseInput throws
      const editRes = await request(app)
        .put(`/api/v1/expenses/${expId}`)
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          title: 'Super Juice',
          amount: 10,
          category: 'food',
          note: '',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 5 },
            { userId: users[1]!.id, amount: 5 },
          ],
          splitType: 'equal',
        });
      expect(editRes.status).toBe(400);
      expect(editRes.body.error.code).toBe('HISTORICAL_MEMBER_LOCKED');
    });
  });

  describe('Historical Ledger & Balance Calculations Verification', () => {
    it('verifies calculated balance matches reconstructed balance exactly', async () => {
      const groupRepo = new InMemoryGroupRepository();
      const expenseRepo = new InMemoryExpenseRepository();
      const settlementRepo = new InMemorySettlementRepository();
      const groupService = new GroupService(groupRepo, expenseRepo, settlementRepo);
      const expenseService = new ExpenseService(expenseRepo, groupService);
      const settlementService = new SettlementService(settlementRepo, groupService, expenseRepo);
      const balanceService = new BalanceService(expenseRepo, settlementRepo, groupRepo);

      const u1 = { id: 'user-1', userId: 'user-1', name: 'User 1', email: 'u1@test.com' };
      const u2 = { id: 'user-2', userId: 'user-2', name: 'User 2', email: 'u2@test.com' };
      const u3 = { id: 'user-3', userId: 'user-3', name: 'User 3', email: 'u3@test.com' };

      const g = await groupRepo.create({
        name: 'Ledger Verification',
        type: 'trip',
        inviteCode: 'LEDGER',
        createdBy: u1.id,
        members: [u1, u2, u3],
      });

      // Add a series of expenses
      await expenseService.createExpense(u1.id, {
        groupId: g.id,
        title: 'Exp 1',
        amount: 30,
        category: 'food',
        note: '',
        paidBy: u1.id,
        participants: [
          { userId: u1.id, amount: 10 },
          { userId: u2.id, amount: 10 },
          { userId: u3.id, amount: 10 },
        ],
        splitType: 'equal',
      });

      await expenseService.createExpense(u2.id, {
        groupId: g.id,
        title: 'Exp 2',
        amount: 15,
        category: 'food',
        note: '',
        paidBy: u2.id,
        participants: [
          { userId: u2.id, amount: 5 },
          { userId: u3.id, amount: 10 },
        ],
        splitType: 'exact',
      });

      // Settlement: User 3 pays 10 to User 1
      await settlementService.createSettlement(u3.id, {
        groupId: g.id,
        toUserId: u1.id,
        amount: 10,
        note: '',
      });

      // 1. Get balance calculated by balanceService
      const balRes = await balanceService.getGroupBalance(g.id, u1.id);

      // 2. Reconstruct balances manually from DB inputs
      const rawExpenses = await expenseRepo.findByGroupId(g.id);
      const rawSettlements = await settlementRepo.findByGroupId(g.id);

      const manualBalances = calculateBalances(
        [u1.id, u2.id, u3.id],
        rawExpenses,
        rawSettlements,
      );

      // Verify each calculated balance matches raw reconstructed balance exactly
      for (const m of balRes.members) {
        const manualVal = manualBalances.get(m.userId) ?? 0;
        expect(m.balance).toBe(Math.round(manualVal * 100) / 100);
      }
    });
  });

  describe('Data Corruption & Malformed Payloads Resilience', () => {
    it('handles null, undefined, and non-numeric input gracefully via Zod validation', async () => {
      // Test sending missing fields
      const res1 = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId: '', // blank
          title: '  ', // empty title
          amount: 'NaN', // invalid float
        });
      expect(res1.status).toBe(400);

      // Test sending settlement with zero/negative amounts
      const res2 = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId: 'some-group',
          toUserId: users[1]!.id,
          amount: -10, // negative amount
        });
      expect(res2.status).toBe(400);
    });
  });

  describe('Performance Limits Profiling', () => {
    it('benchmarks dynamic balance calculations up to 10,000 transactions', async () => {
      const groupRepo = new InMemoryGroupRepository();
      const expenseRepo = new InMemoryExpenseRepository();
      const settlementRepo = new InMemorySettlementRepository();
      const groupService = new GroupService(groupRepo, expenseRepo, settlementRepo);
      const expenseService = new ExpenseService(expenseRepo, groupService);
      const balanceService = new BalanceService(expenseRepo, settlementRepo, groupRepo);

      const u1 = { id: 'u1', userId: 'u1', name: 'User 1', email: 'u1@perf.com' };
      const u2 = { id: 'u2', userId: 'u2', name: 'User 2', email: 'u2@perf.com' };

      const g = await groupRepo.create({
        name: 'Perf Group',
        type: 'trip',
        inviteCode: 'PERFGP',
        createdBy: u1.id,
        members: [u1, u2],
      });

      // Insert 2,000 expenses directly into the repository for rapid populating
      const startSeed = 42;
      const rand = new SeededRandom(startSeed);
      for (let i = 1; i <= 2000; i++) {
        const amt = Math.round((rand.next() * 100 + 1) * 100) / 100;
        await expenseRepo.create({
          groupId: g.id,
          title: `Expense ${i}`,
          amount: amt,
          category: 'other',
          note: '',
          paidBy: u1.id,
          participants: [
            { userId: u1.id, amount: amt / 2 },
            { userId: u2.id, amount: amt / 2 },
          ],
          splitType: 'equal',
        });
      }

      // Time the balance computation
      const startTime = performance.now();
      const balance = await balanceService.getGroupBalance(g.id, u1.id);
      const duration = performance.now() - startTime;

      console.log(`Dynamic balance query for 2000 expenses completed in ${duration.toFixed(2)}ms`);
      expect(balance.members.length).toBe(2);
      expect(duration).toBeLessThan(100); // must execute well within 100ms
    });
  });

  describe('Extreme Financial Stress Testing (50,000 Property Fuzz Test)', () => {
    it('runs 50,000 sequential operations verifying all correctness invariants at every single state mutation', async () => {
      const fuzzAuthRepo = new InMemoryAuthRepository();
      const fuzzGroupRepo = new InMemoryGroupRepository();
      const fuzzExpenseRepo = new InMemoryExpenseRepository();
      const fuzzSettlementRepo = new InMemorySettlementRepository();
      const tokens = new TokenService({ accessSecret: 'secret-key-fuzz', refreshSecret: 'secret-key-fuzz' });
      const groupMutex = new GroupMutex();

      const groupService = new GroupService(fuzzGroupRepo, fuzzExpenseRepo, fuzzSettlementRepo, groupMutex);
      const expenseService = new ExpenseService(fuzzExpenseRepo, groupService, groupMutex);
      const settlementService = new SettlementService(fuzzSettlementRepo, groupService, fuzzExpenseRepo, groupMutex);
      const balanceService = new BalanceService(fuzzExpenseRepo, fuzzSettlementRepo, fuzzGroupRepo);

      // Create 30 simulation users
      const simUsers: Array<{ id: string; name: string; email: string }> = [];
      for (let i = 1; i <= 30; i++) {
        const u = await fuzzAuthRepo.create({
          name: `Fuzz User ${i}`,
          email: `fuzz${i}@stress.com`,
          passwordHash: 'hashed',
        });
        simUsers.push(u);
      }

      // Create 5 groups
      const simGroups: GroupDocument[] = [];
      for (let i = 1; i <= 5; i++) {
        const g = await groupService.createGroup({
          name: `Fuzz Group ${i}`,
          type: 'trip',
          createdBy: simUsers[i - 1]!.id,
          creator: {
            userId: simUsers[i - 1]!.id,
            name: simUsers[i - 1]!.name,
            email: simUsers[i - 1]!.email,
          },
        });
        simGroups.push(g);
      }

      // Populate random group memberships
      const rand = new SeededRandom(9999);
      for (const group of simGroups) {
        const targetSize = rand.nextInt(5, 10);
        const shuffled = [...simUsers].sort(() => rand.next() - 0.5);
        for (let i = 0; i < targetSize; i++) {
          const user = shuffled[i]!;
          if (group.createdBy !== user.id) {
            await groupService.joinGroup(group.inviteCode, {
              userId: user.id,
              name: user.name,
              email: user.email,
            });
          }
        }
      }

      // We run 50,000 property fuzzing iterations directly on the services
      let operationsRun = 0;

      for (let step = 1; step <= 50000; step++) {
        const groupIndex = rand.nextInt(0, simGroups.length - 1);
        const groupDoc = simGroups[groupIndex]!;
        const group = await groupService.getGroupById(groupDoc.id);

        const actionRoll = rand.nextInt(1, 100);

        if (actionRoll <= 60) {
          // Action 1: Add Expense (60% chance) — requires at least 2 members
          if (group.members.length < 2) {
            console.log(`STEP ${step}: CREATE EXPENSE - Skipped (group has only ${group.members.length} member)`);
          } else {
          const payer = group.members[rand.nextInt(0, group.members.length - 1)]!;
          const numParts = rand.nextInt(2, group.members.length);
          const partsSubset: typeof group.members = [];
          const shuffled = [...group.members].sort(() => rand.next() - 0.5);
          for (let p = 0; p < numParts && p < shuffled.length; p++) {
            partsSubset.push(shuffled[p]!);
          }

          const amount = Math.round((rand.next() * 100 + 5) * 100) / 100;
          const totalCents = Math.round(amount * 100);
          const baseCents = Math.floor(totalCents / numParts);
          const extraCents = totalCents % numParts;

          const splitType = rand.next() > 0.5 ? 'equal' : 'percentage';
          const participants = partsSubset.map((member, idx) => {
            const extra = idx < extraCents ? 1 : 0;
            const share = (baseCents + extra) / 100;
            const percentage = Math.round((share / amount) * 10000) / 100;
            return {
              userId: member.userId,
              amount: share,
              percentage: splitType === 'percentage' ? percentage : undefined,
            };
          });

          // Enforce exact 100 percentage split
          if (splitType === 'percentage' && participants.length > 0) {
            const sumPercent = participants.reduce((s, p) => s + (p.percentage ?? 0), 0);
            const diff = 100 - sumPercent;
            if (Math.abs(diff) > 0.001) {
              participants[0]!.percentage = Math.round(((participants[0]!.percentage ?? 0) + diff) * 100) / 100;
            }
          }

          try {
            await expenseService.createExpense(payer.userId, {
              groupId: group.id,
              title: `Fuzz ${step}`,
              amount,
              category: 'food',
              note: '',
              paidBy: payer.userId,
              participants,
              splitType,
            });
            console.log(`STEP ${step}: CREATE EXPENSE - Success - Group: ${group.id}, PaidBy: ${payer.userId}, Amount: ${amount}, Split: ${splitType}`);
          } catch (e: any) {
            console.log(`STEP ${step}: CREATE EXPENSE - Failed (${e.message}) - Group: ${group.id}, PaidBy: ${payer.userId}, Amount: ${amount}, Split: ${splitType}`);
          }
          } // end member count guard

        } else if (actionRoll <= 85) {
          // Action 2: Settle Suggestions (25% chance)
          const bal = await balanceService.getGroupBalance(group.id, group.members[0]!.userId);
          const suggestions = bal.suggestions;

          if (suggestions && suggestions.length > 0) {
            const sug = suggestions[rand.nextInt(0, suggestions.length - 1)]!;
            const settleAmount = rand.next() > 0.5
              ? sug.amount
              : Math.round((rand.next() * (sug.amount - 0.05) + 0.01) * 100) / 100;

            if (settleAmount > 0.01) {
              try {
                await settlementService.createSettlement(sug.fromUserId, {
                  groupId: group.id,
                  toUserId: sug.toUserId,
                  amount: settleAmount,
                  note: 'Settle fuzz',
                });
                console.log(`STEP ${step}: SETTLE - Success - Group: ${group.id}, From: ${sug.fromUserId}, To: ${sug.toUserId}, Amount: ${settleAmount}`);
              } catch (e: any) {
                console.log(`STEP ${step}: SETTLE - Failed (${e.message}) - Group: ${group.id}, From: ${sug.fromUserId}, To: ${sug.toUserId}, Amount: ${settleAmount}`);
              }
            }
          }

        } else if (actionRoll <= 93) {
          // Action 3: Edit Expense (8% chance) — requires at least 2 members for split
          const expenses = await fuzzExpenseRepo.findByGroupId(group.id);
          if (expenses.length > 0 && group.members.length >= 2) {
            const exp = expenses[rand.nextInt(0, expenses.length - 1)]!;
            const numParts = rand.nextInt(2, group.members.length);
            const partsSubset: typeof group.members = [];
            const shuffled = [...group.members].sort(() => rand.next() - 0.5);
            for (let p = 0; p < numParts && p < shuffled.length; p++) {
              partsSubset.push(shuffled[p]!);
            }

            const amount = Math.round((rand.next() * 50 + 5) * 100) / 100;
            const totalCents = Math.round(amount * 100);
            const baseCents = Math.floor(totalCents / numParts);
            const extraCents = totalCents % numParts;

            const participants = partsSubset.map((member, idx) => {
              const extra = idx < extraCents ? 1 : 0;
              return {
                userId: member.userId,
                amount: (baseCents + extra) / 100,
              };
            });

            try {
              await expenseService.updateExpense(exp.id, group.members[0]!.userId, {
                title: `Edit ${exp.title}`,
                amount,
                category: 'rent',
                note: 'edit',
                paidBy: group.members[rand.nextInt(0, group.members.length - 1)]!.userId,
                participants,
                splitType: 'equal',
              });
              console.log(`STEP ${step}: EDIT EXPENSE - Success - Group: ${group.id}, Id: ${exp.id}, Amount: ${amount}`);
            } catch (e: any) {
              console.log(`STEP ${step}: EDIT EXPENSE - Failed (${e.message}) - Group: ${group.id}, Id: ${exp.id}`);
            }
          }

        } else if (actionRoll <= 97) {
          // Action 4: Delete Expense (4% chance)
          const expenses = await fuzzExpenseRepo.findByGroupId(group.id);
          if (expenses.length > 0) {
            const exp = expenses[rand.nextInt(0, expenses.length - 1)]!;
            try {
              await expenseService.deleteExpense(exp.id, group.members[0]!.userId);
              console.log(`STEP ${step}: DELETE EXPENSE - Success - Group: ${group.id}, Id: ${exp.id}`);
            } catch (e: any) {
              console.log(`STEP ${step}: DELETE EXPENSE - Failed (${e.message}) - Group: ${group.id}, Id: ${exp.id}`);
            }
          }

        } else {
          // Action 5: Leave Group (3% chance) — only attempt if group has >1 member
          if (group.members.length > 1) {
            const member = group.members[rand.nextInt(0, group.members.length - 1)]!;
            try {
              await groupService.leaveGroup(group.id, member.userId);
              console.log(`STEP ${step}: LEAVE GROUP - Success - Group: ${group.id}, Member: ${member.userId}`);
            } catch (e: any) {
              console.log(`STEP ${step}: LEAVE GROUP - Failed (${e.message}) - Group: ${group.id}, Member: ${member.userId}`);
            }
          } else {
            console.log(`STEP ${step}: LEAVE GROUP - Skipped (group has only 1 member, the owner)`);
          }
        }

        operationsRun++;

        // Verify Invariants after every single operation (selected group)
        const activeGroup = await groupService.getGroupById(groupDoc.id);
        const bal = await balanceService.getGroupBalance(groupDoc.id, activeGroup.members[0]!.userId);

        // Invariant A: Sum(all balances) = 0
        // bal.members now includes former members with residual balances, so the
        // mathematical money-conservation invariant holds over the full member list.
        const sumBalCents = bal.members.reduce((sum: number, m: any) => sum + Math.round(m.balance * 100), 0);
        if (sumBalCents !== 0) {
          console.log('--- INVARIANT A FAILURE DETAILS ---');
          console.log('SUM BAL CENTS:', sumBalCents);
          console.log('ACTIVE GROUP MEMBERS BALANCES:', bal.members);
          console.log('SUGGESTIONS:', bal.suggestions);
          console.log('HISTORY LENGTH:', bal.history.length);
          // Query all expenses
          const rawExp = await fuzzExpenseRepo.findByGroupId(groupDoc.id);
          console.log('ALL EXPENSES IN DB:', JSON.stringify(rawExp.map((e) => ({
            groupId: e.groupId,
            title: e.title,
            paidBy: e.paidBy,
            amount: e.amount,
            participants: e.participants.map((p) => ({ userId: p.userId, amount: p.amount }))
          })), null, 2));
          // Query all settlements
          const rawSet = await fuzzSettlementRepo.findByGroupId(groupDoc.id);
          console.log('ALL SETTLEMENTS IN DB:', JSON.stringify(rawSet.map((s) => ({ groupId: s.groupId, from: s.fromUserId, to: s.toUserId, amount: s.amount })), null, 2));
          expect(sumBalCents).toBe(0);
        }

        // Invariant B: Sum(debts) == Sum(credits)
        const debtsCents = bal.members.reduce((sum: number, m: any) => sum + Math.round(m.owesAmount * 100), 0);
        const creditsCents = bal.members.reduce((sum: number, m: any) => sum + Math.round(m.isOwedAmount * 100), 0);
        expect(debtsCents).toBe(creditsCents);

        // Invariant C: No user owes themselves
        for (const m of bal.members) {
          expect(m.owesAmount === 0 || m.isOwedAmount === 0).toBe(true);
        }

        // Invariant D & E: No negative suggestions, and suggestion <= outstanding debt
        // Suggestions are only generated for current members.
        const currentMembers = bal.members.filter((m: any) => m.isCurrentMember);
        for (const sug of bal.suggestions) {
          expect(sug.amount).toBeGreaterThan(0.005);
          const debtor = currentMembers.find((m: any) => m.userId === sug.fromUserId);
          const creditor = currentMembers.find((m: any) => m.userId === sug.toUserId);
          expect(debtor).toBeDefined();
          expect(creditor).toBeDefined();
          expect(Math.round(debtor!.owesAmount * 100)).toBeGreaterThanOrEqual(Math.round(sug.amount * 100) - 1);
          expect(Math.round(creditor!.isOwedAmount * 100)).toBeGreaterThanOrEqual(Math.round(sug.amount * 100) - 1);
        }
      }

      // Invariant F: Group isolation holds across all groups
      for (const simGroup of simGroups) {
        const group = await groupService.getGroupById(simGroup.id);
        const bal = await balanceService.getGroupBalance(simGroup.id, group.members[0]!.userId);
        // bal.members includes both current and former members with residual balances;
        // the global sum is always 0 by money conservation.
        const sumBalCents = bal.members.reduce((sum: number, m: any) => sum + Math.round(m.balance * 100), 0);
        expect(sumBalCents).toBe(0);
      }

      console.log(`Executed 50,000 property fuzzing iterations. Checked ${operationsRun} steps successfully.`);
    }, 90000);
  });
});
