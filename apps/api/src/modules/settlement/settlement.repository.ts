import { SettlementModel } from './settlement.model.js';
import type { CreateSettlementInput, SettlementDocument } from './settlement.types.js';

export interface SettlementRepository {
  create(input: CreateSettlementInput): Promise<SettlementDocument>;
  findByGroupId(groupId: string): Promise<SettlementDocument[]>;
  deleteByGroupId(groupId: string): Promise<void>;
}

export class MongooseSettlementRepository implements SettlementRepository {
  async create(input: CreateSettlementInput): Promise<SettlementDocument> {
    const document = await SettlementModel.create(input);
    return document.toObject({ versionKey: false }) as SettlementDocument;
  }

  async findByGroupId(groupId: string): Promise<SettlementDocument[]> {
    const documents = await SettlementModel.find({ groupId }).sort({ createdAt: -1 }).exec();
    return documents.map((document) => document.toObject({ versionKey: false }) as SettlementDocument);
  }

  async deleteByGroupId(groupId: string): Promise<void> {
    await SettlementModel.deleteMany({ groupId }).exec();
  }
}
