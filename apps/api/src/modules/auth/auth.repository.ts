import { UserModel } from './user.model.js';
import type { StoredUser } from './auth.types.js';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface AuthRepository {
  create(input: CreateUserInput): Promise<StoredUser>;
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(id: string): Promise<StoredUser | null>;
  updateRefreshTokenHash(id: string, refreshTokenHash: string | null): Promise<void>;
}

function toStoredUser(document: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
  createdAt: Date;
}): StoredUser {
  return {
    id: document.id,
    name: document.name,
    email: document.email,
    passwordHash: document.passwordHash,
    refreshTokenHash: document.refreshTokenHash,
    createdAt: document.createdAt,
  };
}

export class MongooseAuthRepository implements AuthRepository {
  async create(input: CreateUserInput): Promise<StoredUser> {
    const document = await UserModel.create(input);
    return toStoredUser(document);
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    const document = await UserModel.findOne({ email })
      .select('+passwordHash +refreshTokenHash')
      .exec();
    return document ? toStoredUser(document) : null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    const document = await UserModel.findById(id).select('+passwordHash +refreshTokenHash').exec();
    return document ? toStoredUser(document) : null;
  }

  async updateRefreshTokenHash(id: string, refreshTokenHash: string | null): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { refreshTokenHash }).exec();
  }
}
