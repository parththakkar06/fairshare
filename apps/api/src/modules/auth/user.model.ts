import { Schema, model } from 'mongoose';

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    refreshTokenHash: { type: String, default: null, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const UserModel = model<UserDocument>('User', userSchema);
