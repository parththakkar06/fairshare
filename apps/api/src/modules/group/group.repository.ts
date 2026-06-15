import { GroupModel } from './group.model.js';
import type { CreateGroupInput, GroupDocument } from './group.types.js';

export interface GroupRepository {
  create(input: CreateGroupInput): Promise<GroupDocument>;
  findByInviteCode(inviteCode: string): Promise<GroupDocument | null>;
  findById(id: string): Promise<GroupDocument | null>;
  findAllByMember(userId: string): Promise<GroupDocument[]>;
  addMember(groupId: string, member: { userId: string; name: string; email: string }): Promise<GroupDocument>;
  deleteById(groupId: string): Promise<void>;
}

export class MongooseGroupRepository implements GroupRepository {
  async create(input: CreateGroupInput): Promise<GroupDocument> {
    const document = await GroupModel.create(input);
    return document.toObject({ versionKey: false }) as GroupDocument;
  }

  async findByInviteCode(inviteCode: string): Promise<GroupDocument | null> {
    return GroupModel.findOne({ inviteCode }).exec();
  }

  async findById(id: string): Promise<GroupDocument | null> {
    return GroupModel.findById(id).exec();
  }

  async findAllByMember(userId: string): Promise<GroupDocument[]> {
    return GroupModel.find({ 'members.userId': userId }).exec();
  }

  async addMember(groupId: string, member: { userId: string; name: string; email: string }): Promise<GroupDocument> {
    return GroupModel.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: member } },
      { new: true },
    ).exec() as Promise<GroupDocument>;
  }

  async deleteById(groupId: string): Promise<void> {
    await GroupModel.findByIdAndDelete(groupId).exec();
  }
}
