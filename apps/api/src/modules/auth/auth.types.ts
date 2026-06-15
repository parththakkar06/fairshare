export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
  createdAt: Date;
}

export interface SessionResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}
