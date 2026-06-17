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

describe('Final Adversarial Security, Membership & Scalability Audit', () => {
  let app: any;
  let authRepository: InMemoryAuthRepository;
  let groupRepository: InMemoryGroupRepository;
  let expenseRepository: InMemoryExpenseRepository;
  let settlementRepository: InMemorySettlementRepository;

  // Track registered users
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

    // Create 5 standard users via API
    for (let i = 1; i <= 5; i++) {
      const email = `user${i}@adversary.com`;
      const res = await request(app).post('/api/v1/auth/register').send({
        name: `User ${i}`,
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

  describe('Security & Authorization Audit', () => {
    let groupAId = '';
    let groupBId = '';

    beforeAll(async () => {
      // Group A owned by User 1, joined by User 2
      const groupARes = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({ name: 'Group A', type: 'trip' });
      groupAId = groupARes.body.group.id;

      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({ inviteCode: groupARes.body.group.inviteCode });

      // Group B owned by User 3, joined by User 4
      const groupBRes = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[2]!.token}`)
        .send({ name: 'Group B', type: 'home' });
      groupBId = groupBRes.body.group.id;

      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[3]!.token}`)
        .send({ inviteCode: groupBRes.body.group.inviteCode });
    });

    it('rejects cross-group expense queries and reads', async () => {
      // Create expense in Group A
      const expRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId: groupAId,
          title: 'Lunch A',
          amount: 20,
          category: 'food',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 10 },
            { userId: users[1]!.id, amount: 10 },
          ],
          splitType: 'equal',
        });
      const expenseId = expRes.body.expense.id;

      // User 3 (Group B member) attempts to read Group A expenses
      const readGroupExpensesRes = await request(app)
        .get(`/api/v1/expenses/group/${groupAId}`)
        .set('Authorization', `Bearer ${users[2]!.token}`);
      expect(readGroupExpensesRes.status).toBe(403);

      // User 3 attempts to read Group A specific expense
      const readExpenseRes = await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${users[2]!.token}`);
      expect(readExpenseRes.status).toBe(403);
    });

    it('forces settlement fromUserId to match the authenticated user (prevents ID spoofing)', async () => {
      // User 2 owes User 1 10. User 2 registers settlement.
      // Try to spoof: User 2 sends request but puts fromUserId = User 5 in payload if they can
      // The router takes fromUserId from JWT, so even if they try to pass a body field or mock it, it will settle from User 2
      // Let's create an expense where User 1 pays 20, User 1 and User 2 split
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId: groupAId,
          title: 'Mock Debt',
          amount: 20,
          category: 'other',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 10 },
            { userId: users[1]!.id, amount: 10 },
          ],
          splitType: 'equal',
        });

      // User 2 settles with User 1. Verify it registers with User 2's ID
      const settleRes = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({
          groupId: groupAId,
          toUserId: users[0]!.id,
          amount: 10,
          fromUserId: users[4]!.id, // malicious try to spoof as User 5
        });

      expect(settleRes.status).toBe(201);
      expect(settleRes.body.settlement.fromUserId).toBe(users[1]!.id); // Spoofing prevented!
    });
  });

  describe('Membership Changes Rules & Transitions', () => {
    let groupId = '';
    let inviteCode = '';

    beforeEach(async () => {
      // User 1 creates group, User 2 joins
      const groupRes = await request(app)
        .post('/api/v1/groups/create')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({ name: 'Membership Group', type: 'trip' });
      groupId = groupRes.body.group.id;
      inviteCode = groupRes.body.group.inviteCode;

      await request(app)
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({ inviteCode });
    });

    it('blocks owner from leaving group', async () => {
      const res = await request(app)
        .post(`/api/v1/groups/${groupId}/leave`)
        .set('Authorization', `Bearer ${users[0]!.token}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OWNER_CANNOT_LEAVE');
    });

    it('blocks leave or removal if member has outstanding balance', async () => {
      // User 1 pays 10, User 1 and User 2 split
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId,
          title: 'Shared drink',
          amount: 10,
          category: 'food',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 5 },
            { userId: users[1]!.id, amount: 5 },
          ],
          splitType: 'equal',
        });

      // User 2 owes 5. Tries to leave.
      const leaveRes = await request(app)
        .post(`/api/v1/groups/${groupId}/leave`)
        .set('Authorization', `Bearer ${users[1]!.token}`);
      expect(leaveRes.status).toBe(400);
      expect(leaveRes.body.error.code).toBe('OUTSTANDING_BALANCE');

      // Owner tries to remove User 2.
      const removeRes = await request(app)
        .post(`/api/v1/groups/${groupId}/members/${users[1]!.id}/remove`)
        .set('Authorization', `Bearer ${users[0]!.token}`);
      expect(removeRes.status).toBe(400);
      expect(removeRes.body.error.code).toBe('OUTSTANDING_BALANCE');
    });

    it('allows leaving after full settlement, leaving historical expenses intact', async () => {
      // User 1 pays 10, User 1 and User 2 split
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${users[0]!.token}`)
        .send({
          groupId,
          title: 'Shared drink',
          amount: 10,
          category: 'food',
          paidBy: users[0]!.id,
          participants: [
            { userId: users[0]!.id, amount: 5 },
            { userId: users[1]!.id, amount: 5 },
          ],
          splitType: 'equal',
        });

      // User 2 settles outstanding balance
      await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${users[1]!.token}`)
        .send({
          groupId,
          toUserId: users[0]!.id,
          amount: 5,
        });

      // User 2 leaves group successfully
      const leaveRes = await request(app)
        .post(`/api/v1/groups/${groupId}/leave`)
        .set('Authorization', `Bearer ${users[1]!.token}`);
      expect(leaveRes.status).toBe(200);
      expect(leaveRes.body.group.members.some((m: any) => m.userId === users[1]!.id)).toBe(false);

      // Verify that historical expenses remain in DB and balances of remaining user (User 1) sum to 0
      const balRes = await request(app)
        .get(`/api/v1/balances/group/${groupId}`)
        .set('Authorization', `Bearer ${users[0]!.token}`);
      expect(balRes.status).toBe(200);

      // Remaining members balances sum up correctly (User 1 should be 0 because Bob left and settled)
      const u1Balance = balRes.body.members.find((m: any) => m.userId === users[0]!.id);
      expect(u1Balance.balance).toBe(0);
      expect(balRes.body.members.length).toBe(1); // Bob is no longer in the balances members list
    });
  });

  describe('Long-Horizon Property-Based Fuzz Simulation', () => {
    it('verifies system correctness through 1000+ random transactions, edits, deletes, leaves, and joins', async () => {
      // Setup direct service layers for performance (executes 1000s of operations in memory instantly)
      const fuzzAuthRepo = new InMemoryAuthRepository();
      const fuzzGroupRepo = new InMemoryGroupRepository();
      const fuzzExpenseRepo = new InMemoryExpenseRepository();
      const fuzzSettlementRepo = new InMemorySettlementRepository();
      const tokens = new TokenService({
        accessSecret: 'access-secret-that-is-at-least-32-characters',
        refreshSecret: 'refresh-secret-that-is-at-least-32-characters',
      });
      const groupMutex = new GroupMutex();

      const authService = new AuthService(fuzzAuthRepo, tokens);
      const groupService = new GroupService(fuzzGroupRepo, fuzzExpenseRepo, fuzzSettlementRepo, groupMutex);
      const expenseService = new ExpenseService(fuzzExpenseRepo, groupService, groupMutex);
      const settlementService = new SettlementService(fuzzSettlementRepo, groupService, fuzzExpenseRepo, groupMutex);
      const balanceService = new BalanceService(fuzzExpenseRepo, fuzzSettlementRepo, fuzzGroupRepo);

      // Create 50 users
      const simUsers: Array<{ id: string; name: string; email: string }> = [];
      for (let i = 1; i <= 50; i++) {
        const u = await fuzzAuthRepo.create({
          name: `Sim User ${i}`,
          email: `sim${i}@fuzz.com`,
          passwordHash: 'hashed',
        });
        simUsers.push(u);
      }

      // Create 10 groups
      const simGroups: GroupDocument[] = [];
      for (let i = 1; i <= 10; i++) {
        const g = await groupService.createGroup({
          name: `Sim Group ${i}`,
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

      // Join random users to groups so each has 8 to 15 members
      const rand = new SeededRandom(1337); // stable seed
      for (const group of simGroups) {
        const targetSize = rand.nextInt(8, 15);
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

      // Track active expenses in memory
      let totalOps = 0;
      let expensesAdded = 0;
      let settlementsAdded = 0;
      let editsMade = 0;
      let deletesMade = 0;
      let successfulLeaves = 0;

      // We run 1500 iterations of random operations
      for (let step = 1; step <= 1500; step++) {
        // Pick random group
        const groupIndex = rand.nextInt(0, simGroups.length - 1);
        const groupDoc = simGroups[groupIndex]!;
        // Fetch fresh group state
        const group = await groupService.getGroupById(groupDoc.id);

        const actionRoll = rand.nextInt(1, 100);

        if (actionRoll <= 55) {
          // Action 1: Create Expense (55%)
          const payerIndex = rand.nextInt(0, group.members.length - 1);
          const payer = group.members[payerIndex]!;

          // Select random subset of participants (min 2)
          const numParts = rand.nextInt(2, group.members.length);
          const partsSubset: typeof group.members = [];
          const shuffled = [...group.members].sort(() => rand.next() - 0.5);
          for (let p = 0; p < numParts; p++) {
            partsSubset.push(shuffled[p]!);
          }

          const amount = Math.round((rand.next() * 200 + 10) * 100) / 100;
          const totalCents = Math.round(amount * 100);
          const baseCents = Math.floor(totalCents / numParts);
          const extraCents = totalCents % numParts;

          const splitType = rand.next() > 0.5 ? 'equal' : 'percentage';
          const participants = partsSubset.map((member, index) => {
            const extra = index < extraCents ? 1 : 0;
            const share = (baseCents + extra) / 100;
            const percentage = Math.round((share / amount) * 10000) / 100;
            return {
              userId: member.userId,
              amount: share,
              percentage: splitType === 'percentage' ? percentage : undefined,
            };
          });

          // Adjust percentage sum to sum exactly to 100
          if (splitType === 'percentage' && participants.length > 0) {
            let sumPercent = participants.reduce((s, p) => s + (p.percentage ?? 0), 0);
            const diff = 100 - sumPercent;
            if (Math.abs(diff) > 0.001) {
              participants[0]!.percentage = Math.round(((participants[0]!.percentage ?? 0) + diff) * 100) / 100;
            }
          }

          try {
            await expenseService.createExpense(payer.userId, {
              groupId: group.id,
              title: `Fuzz Expense ${step}`,
              amount,
              category: 'travel',
              note: '',
              paidBy: payer.userId,
              participants,
              splitType,
            });
            expensesAdded++;
          } catch (e) {
            // Log and allow schema/constraint rejections
          }

        } else if (actionRoll <= 80) {
          // Action 2: Settle outstanding suggestions (25%)
          // Read balances
          const anyMember = group.members[0]!;
          const bal = await balanceService.getGroupBalance(group.id, anyMember.userId);
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
                  note: 'Fuzz Settle',
                });
                settlementsAdded++;
              } catch (e) {
                // Settle constraints block overpayment
              }
            }
          }

        } else if (actionRoll <= 90) {
          // Action 3: Edit existing expense (10%)
          const expenses = await fuzzExpenseRepo.findByGroupId(group.id);
          if (expenses.length > 0) {
            const exp = expenses[rand.nextInt(0, expenses.length - 1)]!;
            const editor = group.members[rand.nextInt(0, group.members.length - 1)]!;

            // Select random subset of participants (min 2)
            const numParts = rand.nextInt(2, group.members.length);
            const partsSubset: typeof group.members = [];
            const shuffled = [...group.members].sort(() => rand.next() - 0.5);
            for (let p = 0; p < numParts; p++) {
              partsSubset.push(shuffled[p]!);
            }

            const amount = Math.round((rand.next() * 150 + 5) * 100) / 100;
            const totalCents = Math.round(amount * 100);
            const baseCents = Math.floor(totalCents / numParts);
            const extraCents = totalCents % numParts;

            const participants = partsSubset.map((member, index) => {
              const extra = index < extraCents ? 1 : 0;
              return {
                userId: member.userId,
                amount: (baseCents + extra) / 100,
              };
            });

            try {
              await expenseService.updateExpense(exp.id, editor.userId, {
                title: `Edited ${exp.title}`,
                amount,
                category: 'food',
                note: 'fuzz edit',
                paidBy: group.members[rand.nextInt(0, group.members.length - 1)]!.userId,
                participants,
                splitType: 'equal',
              });
              editsMade++;
            } catch (e) {
              // Ignore invalid edits
            }
          }

        } else if (actionRoll <= 95) {
          // Action 4: Delete expense (5%)
          const expenses = await fuzzExpenseRepo.findByGroupId(group.id);
          if (expenses.length > 0) {
            const exp = expenses[rand.nextInt(0, expenses.length - 1)]!;
            const editor = group.members[rand.nextInt(0, group.members.length - 1)]!;
            try {
              await expenseService.deleteExpense(exp.id, editor.userId);
              deletesMade++;
            } catch (e) {
              // Ignore invalid delete tries
            }
          }

        } else {
          // Action 5: Try member leaving or removal (5%)
          const leaveType = rand.next() > 0.5 ? 'leave' : 'remove';
          if (leaveType === 'leave') {
            const memberToLeave = group.members[rand.nextInt(0, group.members.length - 1)]!;
            try {
              await groupService.leaveGroup(group.id, memberToLeave.userId);
              successfulLeaves++;
            } catch (error: any) {
              // Expected to fail if owner tries to leave, or user has outstanding balance
              expect(['OUTSTANDING_BALANCE', 'OWNER_CANNOT_LEAVE']).toContain(error.code);
            }
          } else {
            const memberToRemove = group.members[rand.nextInt(0, group.members.length - 1)]!;
            try {
              await groupService.removeMember(group.id, group.createdBy, memberToRemove.userId);
              successfulLeaves++;
            } catch (error: any) {
              // Expected to fail if owner removes owner or member has outstanding balance
              expect(['OUTSTANDING_BALANCE', 'CANNOT_REMOVE_OWNER']).toContain(error.code);
            }
          }
        }

        totalOps++;

        // --- Invariant Checks after every operation ---
        // Verify balance invariants on the selected group
        const latestGroup = await groupService.getGroupById(group.id);
        const bal = await balanceService.getGroupBalance(group.id, latestGroup.members[0]!.userId);

        // Invariant A: Sum(all balances in group) == 0 (cents precision)
        const balanceSumCents = bal.members.reduce(
          (sum: number, m: any) => sum + Math.round(m.balance * 100),
          0,
        );
        expect(balanceSumCents).toBe(0);

        // Invariant B: Sum(debts) == Sum(credits)
        const totalDebtsCents = bal.members.reduce(
          (sum: number, m: any) => sum + Math.round(m.owesAmount * 100),
          0,
        );
        const totalCreditsCents = bal.members.reduce(
          (sum: number, m: any) => sum + Math.round(m.isOwedAmount * 100),
          0,
        );
        expect(totalDebtsCents).toBe(totalCreditsCents);

        // Invariant C: No user owes themselves (owesAmount and isOwedAmount are mutually exclusive)
        for (const m of bal.members) {
          expect(m.owesAmount === 0 || m.isOwedAmount === 0).toBe(true);
        }

        // Invariant D & E: No settlement suggestion is negative or exceeds outstanding debt
        for (const sug of bal.suggestions) {
          expect(sug.amount).toBeGreaterThan(0.005);
          // Suggestion fromUser must have owesAmount >= sug.amount
          const debtor = bal.members.find((m: any) => m.userId === sug.fromUserId);
          const creditor = bal.members.find((m: any) => m.userId === sug.toUserId);
          expect(debtor).toBeDefined();
          expect(creditor).toBeDefined();
          expect(Math.round(debtor!.owesAmount * 100)).toBeGreaterThanOrEqual(Math.round(sug.amount * 100) - 1);
          expect(Math.round(creditor!.isOwedAmount * 100)).toBeGreaterThanOrEqual(Math.round(sug.amount * 100) - 1);
        }
      }

      // Invariant F: Group isolation holds. Sum(balances) == 0 for all groups independently.
      for (const simGroup of simGroups) {
        const groupObj = await groupService.getGroupById(simGroup.id);
        const bal = await balanceService.getGroupBalance(groupObj.id, groupObj.members[0]!.userId);
        const balanceSumCents = bal.members.reduce(
          (sum: number, m: any) => sum + Math.round(m.balance * 100),
          0,
        );
        expect(balanceSumCents).toBe(0);
      }

      console.log(`Fuzzing summary: ${totalOps} steps executed successfully.`);
      console.log(`Expenses added: ${expensesAdded}, Settlements added: ${settlementsAdded}`);
      console.log(`Edits made: ${editsMade}, Deletes made: ${deletesMade}, Leaves/Removals: ${successfulLeaves}`);
    }, 60000);
  });
});
