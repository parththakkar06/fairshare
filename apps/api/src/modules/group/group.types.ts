export type GroupType = 'trip' | 'home' | 'party' | 'office' | 'food';

export interface GroupMember {
  userId: string;
  name: string;
  email: string;
}

export interface GroupDocument {
  id: string;
  name: string;
  type: GroupType;
  inviteCode: string;
  createdBy: string;
  members: GroupMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGroupInput {
  name: string;
  type: GroupType;
  inviteCode: string;
  createdBy: string;
  members: GroupMember[];
}
