import { Schema, model } from 'mongoose';
import type { ExpenseDocument } from './expense.types.js';

const participantSchema = new Schema(
  {
    userId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    percentage: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false },
);

const expenseSchema = new Schema<ExpenseDocument>(
  {
    groupId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0.01 },
    category: {
      type: String,
      required: true,
      enum: ['food', 'travel', 'rent', 'shopping', 'entertainment', 'education', 'other'],
    },
    note: { type: String, trim: true, default: '' },
    paidBy: { type: String, required: true },
    participants: { type: [participantSchema], required: true },
    splitType: { type: String, required: true, enum: ['equal', 'exact', 'percentage'] },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const ExpenseModel = model<ExpenseDocument>('Expense', expenseSchema);
