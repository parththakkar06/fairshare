import { randomUUID } from 'node:crypto';

import type { AuthRepository, CreateUserInput } from '../modules/auth/auth.repository.js';
import type { StoredUser } from '../modules/auth/auth.types.js';

export class InMemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, StoredUser>();

  create(input: CreateUserInput): Promise<StoredUser> {
    const user: StoredUser = {
      id: randomUUID(),
      ...input,
      refreshTokenHash: null,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return Promise.resolve(structuredClone(user));
  }

  findByEmail(email: string): Promise<StoredUser | null> {
    const user = [...this.users.values()].find((candidate) => candidate.email === email);
    return Promise.resolve(user ? structuredClone(user) : null);
  }

  findById(id: string): Promise<StoredUser | null> {
    const user = this.users.get(id);
    return Promise.resolve(user ? structuredClone(user) : null);
  }

  updateRefreshTokenHash(id: string, refreshTokenHash: string | null): Promise<void> {
    const user = this.users.get(id);
    if (user) user.refreshTokenHash = refreshTokenHash;
    return Promise.resolve();
  }
}
