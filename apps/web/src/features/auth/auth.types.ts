export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}
