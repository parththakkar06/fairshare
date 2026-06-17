import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageMotion } from '@/components/ui/page-motion';
import { createGroup, joinGroup, listGroups } from '@/features/groups/groups-api';
import { createGroupSchema, joinGroupSchema } from '@/features/groups/groups.schemas';
import type { CreateGroupInput, JoinGroupInput, Group } from '@/features/groups/groups.types';

type CreateGroupFormValues = CreateGroupInput;
type JoinGroupFormValues = JoinGroupInput;

export function GroupList() {
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: listGroups,
    staleTime: 30_000,
  });

  const createGroupForm = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '', type: 'trip' },
  });

  const joinGroupForm = useForm<JoinGroupFormValues>({
    resolver: zodResolver(joinGroupSchema),
    defaultValues: { inviteCode: '' },
  });

  const filteredGroups = useMemo(
    () => groups.filter((group) => group.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search],
  );

  async function handleCreateGroup(values: CreateGroupFormValues) {
    setMessage(null);
    try {
      await createGroup(values);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      createGroupForm.reset({ name: '', type: 'trip' });
      setMessage('Group created successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create group.');
    }
  }

  async function handleJoinGroup(values: JoinGroupFormValues) {
    setMessage(null);
    try {
      await joinGroup(values);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      joinGroupForm.reset();
      setMessage('Joined group successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to join group.');
    }
  }

  return (
    <PageMotion className="max-w-[1400px]">
      <header className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Groups</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Manage your shared groups</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Create groups, join with invite codes, and start tracking expenses with your friends.</p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="dashboard-card overflow-hidden p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Create a new group</h2>
              <p className="mt-2 text-sm text-slate-500">Set up a shared expense group for travel, home bills, parties, or meals.</p>
            </div>
            <div className="rounded-3xl bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">Groups</div>
          </div>

          <form className="grid gap-4" onSubmit={createGroupForm.handleSubmit(handleCreateGroup)} noValidate>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Group name</label>
              <Input placeholder="Weekend getaway" {...createGroupForm.register('name')} />
              {createGroupForm.formState.errors.name ? (
                <p className="mt-2 text-sm text-rose-600">{createGroupForm.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Group type</label>
              <select
                className="form-select"
                {...createGroupForm.register('type')}
              >
                <option value="trip">Trip</option>
                <option value="home">Home</option>
                <option value="party">Party</option>
                <option value="office">Office</option>
                <option value="food">Food</option>
              </select>
              {createGroupForm.formState.errors.type ? (
                <p className="mt-2 text-sm text-rose-600">{createGroupForm.formState.errors.type.message}</p>
              ) : null}
            </div>

            <Button type="submit" size="lg" className="w-full">
              <Plus className="size-4" />
              Create group
            </Button>
          </form>
        </section>

        <section className="dashboard-card overflow-hidden p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">Join a group</h2>
            <p className="mt-2 text-sm text-slate-500">Enter the invite code from a friend to join an existing shared group.</p>
          </div>

          <form className="grid gap-4" onSubmit={joinGroupForm.handleSubmit(handleJoinGroup)} noValidate>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Invite code</label>
              <Input
                placeholder="AB12CD"
                {...joinGroupForm.register('inviteCode')}
                className="uppercase tracking-[0.24em]"
              />
              {joinGroupForm.formState.errors.inviteCode ? (
                <p className="mt-2 text-sm text-rose-600">{joinGroupForm.formState.errors.inviteCode.message}</p>
              ) : null}
            </div>

            <Button type="submit" size="lg" className="w-full">
              <Plus className="size-4" />
              Join group
            </Button>
          </form>
        </section>
      </div>

      {message ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-emerald-50 px-5 py-4 text-sm text-slate-900 shadow-sm">
          {message}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">My groups</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Your shared money groups</h2>
        </div>
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          {groups.length} groups found
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search groups"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-11"
          />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="dashboard-card h-36 animate-pulse" />
          ))
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <motion.article
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Link
                to={`/groups/${group.id}`}
                className="dashboard-card interactive-surface block overflow-hidden p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {group.type}
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-slate-950">{group.name}</h3>
                    <p className="mt-2 break-words text-sm text-slate-500">
                      {group.members.length} members · Invite code {group.inviteCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </div>
                    <ChevronRight className="size-5 text-slate-300" />
                  </div>
                </div>
              </Link>
            </motion.article>
          ))
        ) : (
          <div className="dashboard-card flex min-h-[20rem] items-center justify-center p-8 text-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">No groups yet</p>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">Create or join a group to begin</h2>
              <p className="mt-3 text-sm text-slate-500">Use the forms above to start sharing expenses with friends and family.</p>
            </div>
          </div>
        )}
      </section>
    </PageMotion>
  );
}
