import request from 'supertest';

import { createApp } from '../app.js';
import { InMemoryAuthRepository } from './in-memory-auth.repository.js';

function createTestApp() {
  return createApp({
    clientOrigin: 'http://localhost:5173',
    environment: 'test',
    jwtAccessSecret: 'access-secret-that-is-at-least-32-characters',
    jwtRefreshSecret: 'refresh-secret-that-is-at-least-32-characters',
    authRepository: new InMemoryAuthRepository(),
  });
}

describe('authentication API', () => {
  it('registers a user and authorizes the protected identity endpoint', async () => {
    const app = createTestApp();
    const registration = await request(app).post('/api/v1/auth/register').send({
      name: 'Jeet Patel',
      email: 'JEET@example.com',
      password: 'strong-password',
    });

    const registrationBody = registration.body as {
      user: { name: string; email: string };
      accessToken: string;
    };

    expect(registration.status).toBe(201);
    expect(registrationBody.user).toMatchObject({
      name: 'Jeet Patel',
      email: 'jeet@example.com',
    });
    expect(registration.body).not.toHaveProperty('refreshToken');
    expect(registration.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const profile = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registrationBody.accessToken}`);

    const profileBody = profile.body as { user: { email: string } };
    expect(profile.status).toBe(200);
    expect(profileBody.user.email).toBe('jeet@example.com');
  });

  it('refreshes a session and invalidates it on logout', async () => {
    const agent = request.agent(createTestApp());
    await agent.post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'strong-password',
    });

    const refresh = await agent.post('/api/v1/auth/refresh');
    expect(refresh.status).toBe(200);
    expect((refresh.body as { accessToken: string }).accessToken).toEqual(expect.any(String));

    expect((await agent.post('/api/v1/auth/logout')).status).toBe(204);
    expect((await agent.post('/api/v1/auth/refresh')).status).toBe(401);
  });

  it('rejects duplicate registration and invalid login without exposing account details', async () => {
    const app = createTestApp();
    const account = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'strong-password',
    };

    await request(app).post('/api/v1/auth/register').send(account);
    const duplicate = await request(app).post('/api/v1/auth/register').send(account);
    const badLogin = await request(app).post('/api/v1/auth/login').send({
      email: account.email,
      password: 'wrong-password',
    });

    expect(duplicate.status).toBe(409);
    expect(badLogin.status).toBe(401);
    expect((badLogin.body as { error: { code: string; message: string } }).error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    });
  });
});
