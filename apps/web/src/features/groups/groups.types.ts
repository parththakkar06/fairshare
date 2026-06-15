export type GroupType = 'trip' | 'home' | 'party' | 'office' | 'food';

export interface GroupMember {
  userId: string;
  name: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  inviteCode: string;
  createdBy: string;
  members: GroupMember[];
  createdAt: string;
}

export interface CreateGroupInput {
  name: string;
  type: GroupType;
}

export interface JoinGroupInput {
  inviteCode: string;
}
