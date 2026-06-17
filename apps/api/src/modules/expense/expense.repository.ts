import { ExpenseModel } from './expense.model.js';
import type { CreateExpenseInput, ExpenseDocument, UpdateExpenseInput } from './expense.types.js';

export interface ExpenseRepository {
  create(input: CreateExpenseInput): Promise<ExpenseDocument>;
  findById(id: string): Promise<ExpenseDocument | null>;
  findByGroupId(groupId: string): Promise<ExpenseDocument[]>;
  update(id: string, input: UpdateExpenseInput): Promise<ExpenseDocument>;
  deleteById(id: string): Promise<void>;
  deleteByGroupId(groupId: string): Promise<void>;
}

export class MongooseExpenseRepository implements ExpenseRepository {
  async create(input: CreateExpenseInput): Promise<ExpenseDocument> {
    const document = await ExpenseModel.create(input);
    return document.toObject({ versionKey: false }) as ExpenseDocument;
  }

  async findById(id: string): Promise<ExpenseDocument | null> {
    const document = await ExpenseModel.findById(id).exec();
    return document ? (document.toObject({ versionKey: false }) as ExpenseDocument) : null;
  }

  async findByGroupId(groupId: string): Promise<ExpenseDocument[]> {
    const documents = await ExpenseModel.find({ groupId }).sort({ createdAt: -1 }).exec();
    return documents.map((document) => document.toObject({ versionKey: false }) as ExpenseDocument);
  }

  async update(id: string, input: UpdateExpenseInput): Promise<ExpenseDocument> {
    const document = await ExpenseModel.findByIdAndUpdate(id, input, { new: true, runValidators: true }).exec();
    if (!document) {
      throw new Error('Expense not found');
    }
    return document.toObject({ versionKey: false }) as ExpenseDocument;
  }

  async deleteById(id: string): Promise<void> {
    await ExpenseModel.findByIdAndDelete(id).exec();
  }

  async deleteByGroupId(groupId: string): Promise<void> {
    await ExpenseModel.deleteMany({ groupId }).exec();
  }
}
