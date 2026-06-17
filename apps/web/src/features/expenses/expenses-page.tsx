import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageMotion } from '@/components/ui/page-motion';
import { ExpenseList } from '@/features/expenses/expense-list';
import { createExpense } from '@/features/expenses/expenses-api';
import { listGroups } from '@/features/groups/groups-api';
import { useAuth } from '@/features/auth/auth-context-value';
import type { Group } from '@/features/groups/groups.types';
import type { CreateExpenseInput, ExpenseCategory } from '@/features/expenses/expenses.types';

const budgetCategories: ExpenseCategory[] = [
  'food',
  'travel',
  'rent',
  'shopping',
  'entertainment',
  'education',
  'other',
];

const createExpenseFormSchema = z.object({
  groupId: z.string().min(1, 'Select a group.'),
  title: z.string().trim().min(3, 'Enter a title.').max(120),
  amount: z.number().positive('Enter an amount greater than zero.'),
  category: z.enum(budgetCategories),
  note: z.string().trim().max(300).optional(),
  paidBy: z.string().min(1, 'Select who paid.'),
  participantIds: z.array(z.string().min(1)).min(1, 'Select at least one participant.'),
});

type ExpenseFormValues = z.infer<typeof createExpenseFormSchema>;

export function ExpensesPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: listGroups,
    staleTime: 30_000,
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const formRef = useRef<HTMLFormElement | null>(null);
  const categoryOptions = ['food', 'travel', 'rent', 'shopping', 'entertainment', 'education', 'other'] as const;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(createExpenseFormSchema),
    defaultValues: {
      groupId: selectedGroupId,
      title: '',
      amount: 0,
      category: 'food',
      note: '',
      paidBy: user?.id ?? '',
      participantIds: selectedGroup?.members.map((member) => member.userId) ?? [],
    },
  });

  useEffect(() => {
    form.setValue('groupId', selectedGroupId);
    if (selectedGroup?.members.length) {
      const memberIds = selectedGroup.members.map((member) => member.userId);
      form.setValue('participantIds', memberIds);
      if (user) {
        form.setValue('paidBy', user.id);
      }
    }
  }, [selectedGroupId, selectedGroup?.members, user, form]);

  console.log(groups);
console.log(selectedGroupId);
console.log(selectedGroup);
  async function handleCreateExpense(values: ExpenseFormValues) {
    setMessage(null);

    const participants = values.participantIds.map((userId) => ({
      userId,
      amount: Number((values.amount / values.participantIds.length).toFixed(2)),
    }));

    const payload: CreateExpenseInput = {
      groupId: values.groupId,
      title: values.title,
      amount: values.amount,
      category: values.category,
      note: values.note,
      paidBy: values.paidBy,
      participants,
      splitType: 'equal',
    };

    try {
      await createExpense(payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses', values.groupId] }),
        queryClient.invalidateQueries({ queryKey: ['balance', values.groupId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
      ]);
      form.reset({
        groupId: values.groupId,
        title: '',
        amount: 0,
        category: 'food',
        note: '',
        paidBy: user?.id ?? '',
        participantIds: selectedGroup?.members.map((member) => member.userId) ?? [],
      });
      setMessage('Expense added successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add expense.');
    }
  }

  return (
    <PageMotion className="max-w-[1400px]">
      <header className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Expenses</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Track shared spending</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Choose a group and review all expenses for the selected shared budget.</p>
        </div>
        <Button
          onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
          type="button"
        >
          <CircleDollarSign className="size-4" />
          Add expense
        </Button>
      </header>

      <section className="dashboard-card overflow-hidden p-6">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Select group</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="inline-flex items-center rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm text-slate-700 shadow-sm">
                <span className="mr-3 font-semibold">Group</span>
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="form-select min-w-0 bg-transparent"
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 text-sm text-slate-500">Choose a group to load its expenses. Use the form below to add a new expense for the group.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Expense summary</p>
            <p className="mt-3">
              {isLoading
                ? 'Loading available groups...'
                : groups.length > 0
                ? `You have ${groups.length} group${groups.length === 1 ? '' : 's'} available.`
                : 'No groups available yet. Create a group to begin tracking expenses.'}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        {selectedGroup ? (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Current group</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{selectedGroup.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Invite code: {selectedGroup.inviteCode}</p>
              </div>
              <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                {selectedGroup.members.length} members
              </div>
            </div>
          </div>
        ) : null}

        <div className="dashboard-card overflow-hidden p-6 mb-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Add a new expense</h2>
              <p className="mt-2 text-sm text-slate-500">Record shared spending for the selected group.</p>
            </div>
            <div className="rounded-3xl bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">Equal split</div>
          </div>

          <form ref={formRef} className="grid gap-4" onSubmit={form.handleSubmit(handleCreateExpense)} noValidate>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
                <Input {...form.register('title')} placeholder="Dinner at the cafe" />
                {form.formState.errors.title ? (
                  <p className="mt-2 text-sm text-rose-600">{form.formState.errors.title.message}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Amount</label>
                <Input type="number" step="0.5" {...form.register('amount', { valueAsNumber: true })} placeholder="₹0.00" />
                {form.formState.errors.amount ? (
                  <p className="mt-2 text-sm text-rose-600">{form.formState.errors.amount.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
                <select
                  {...form.register('category')}
                  className="form-select"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {form.formState.errors.category ? (
                  <p className="mt-2 text-sm text-rose-600">{form.formState.errors.category.message}</p>
                ) : null}
              </div>
               
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Paid by</label>
                <select
                  {...form.register('paidBy')}
                  className="form-select"
                >
                  {selectedGroup?.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.paidBy ? (
                  <p className="mt-2 text-sm text-rose-600">{form.formState.errors.paidBy.message}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Participants</label>
              <select
                multiple
                {...form.register('participantIds')}
                className="form-select h-auto min-h-[140px] py-2"
              >
                {selectedGroup?.members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.participantIds ? (
                <p className="mt-2 text-sm text-rose-600">{form.formState.errors.participantIds.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Note</label>
              <textarea
                {...form.register('note')}
                className="form-textarea placeholder:text-slate-400"
                placeholder="Optional details about the expense"
              />
              {form.formState.errors.note ? (
                <p className="mt-2 text-sm text-rose-600">{form.formState.errors.note.message}</p>
              ) : null}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={!selectedGroupId || !selectedGroup?.members.length}>
              Add expense
            </Button>
          </form>

          {message ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-emerald-50 px-5 py-4 text-sm text-slate-900 shadow-sm">
              {message}
            </div>
          ) : null}
        </div>

        <ExpenseList groupId={selectedGroup?.id ?? ''} members={selectedGroup?.members ?? []} />
      </section>
    </PageMotion>
  );
}
