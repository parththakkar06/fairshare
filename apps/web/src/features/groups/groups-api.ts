import type { Group, CreateGroupInput, JoinGroupInput } from './groups.types';
import { apiClient } from '@/lib/api-client';

interface CreateGroupResponse {
  group: Group;
}

interface JoinGroupResponse {
  group: Group;
}

interface ListGroupsResponse {
  groups: Group[];
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const { data } = await apiClient.post<CreateGroupResponse>('/groups/create', input);
  return data.group;
}

export async function joinGroup(input: JoinGroupInput): Promise<Group> {
  const { data } = await apiClient.post<JoinGroupResponse>('/groups/join', input);
  return data.group;
}

export async function listGroups(): Promise<Group[]> {
  const { data } = await apiClient.get<ListGroupsResponse>('/groups');
  return data.groups;
}
