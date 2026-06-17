import { Schema, model } from 'mongoose';
import type { SettlementDocument } from './settlement.types.js';

const settlementSchema = new Schema<SettlementDocument>(
  {
    groupId: { type: String, required: true, index: true },
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const SettlementModel = model<SettlementDocument>('Settlement', settlementSchema);
