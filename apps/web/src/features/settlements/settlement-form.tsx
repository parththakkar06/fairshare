import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GroupMember } from '@/features/groups/groups.types';
import { useRecordSettlement } from '@/features/settlements/use-record-settlement';

const settlementSchema = z.object({
  toUserId: z.string().min(1, 'Select a recipient.'),
  amount: z.number().positive('Enter an amount greater than zero.'),
  note: z.string().max(128).optional(),
});

type SettlementFormValues = z.infer<typeof settlementSchema>;

interface SettlementFormProps {
  groupId: string;
  members: GroupMember[];
  currentUserId?: string;
  onSuccess?: () => void;
}

export function SettlementForm({ groupId, members, currentUserId, onSuccess }: SettlementFormProps) {
  const recordSettlement = useRecordSettlement(groupId);
  const recipientOptions = members.filter((member) => member.userId !== currentUserId);

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      toUserId: '',
      amount: 0,
      note: '',
    },
  });

  async function onSubmit(values: SettlementFormValues) {
    try {
      await recordSettlement.mutateAsync({
        groupId,
        toUserId: values.toUserId,
        amount: values.amount,
        note: values.note,
      });
      form.reset({ toUserId: '', amount: 0, note: '' });
      onSuccess?.();
    } catch {
      // Mutation error surfaced via recordSettlement.error in parent if needed
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Recipient</label>
        <select
          {...form.register('toUserId')}
          disabled={!recipientOptions.length}
          className="form-select"
        >
          <option value="">Select a member</option>
          {recipientOptions.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </select>
        {form.formState.errors.toUserId ? (
          <p className="mt-2 text-sm text-rose-600">{form.formState.errors.toUserId.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Amount</label>
        <Input type="number" step="0.5" {...form.register('amount', { valueAsNumber: true })} placeholder="₹0.00" />
        {form.formState.errors.amount ? (
          <p className="mt-2 text-sm text-rose-600">{form.formState.errors.amount.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Note</label>
        <Input {...form.register('note')} placeholder="Optional settlement note" />
        {form.formState.errors.note ? (
          <p className="mt-2 text-sm text-rose-600">{form.formState.errors.note.message}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={recordSettlement.isPending}>
        <Plus className="size-4" />
        {recordSettlement.isPending ? 'Recording...' : 'Record settlement'}
      </Button>

      {recordSettlement.isError ? (
        <p className="text-sm text-rose-600">
          {recordSettlement.error instanceof Error ? recordSettlement.error.message : 'Unable to record settlement.'}
        </p>
      ) : null}

      {recordSettlement.isSuccess ? (
        <div className="rounded-3xl border border-slate-200 bg-emerald-50 px-5 py-4 text-sm text-slate-900 shadow-sm">
          Settlement recorded successfully.
        </div>
      ) : null}
    </form>
  );
}
