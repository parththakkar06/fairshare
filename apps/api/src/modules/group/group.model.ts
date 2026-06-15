import { Schema, model } from 'mongoose';
import type { GroupDocument } from './group.types.js';

const memberSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
  },
  { _id: false },
);

const groupSchema = new Schema<GroupDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, enum: ['trip', 'home', 'party', 'office', 'food'] },
    inviteCode: { type: String, required: true, unique: true, uppercase: true },
    createdBy: { type: String, required: true },
    members: { type: [memberSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

groupSchema.index({ inviteCode: 1 }, { unique: true });

export const GroupModel = model<GroupDocument>('Group', groupSchema);
