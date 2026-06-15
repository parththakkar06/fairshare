import { parseEnvironment } from './env.js';

const validEnvironment = {
  NODE_ENV: 'test',
  PORT: '4000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/splitwise-test',
  JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-32-characters',
  CLIENT_ORIGIN: 'http://localhost:5173',
};

describe('parseEnvironment', () => {
  it('coerces and returns valid environment configuration', () => {
    expect(parseEnvironment(validEnvironment)).toMatchObject({
      NODE_ENV: 'test',
      PORT: 4000,
    });
  });

  it('fails clearly when required configuration is missing or invalid', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production' })).toThrow(
      /Invalid environment configuration.*MONGODB_URI.*JWT_ACCESS_SECRET.*CLIENT_ORIGIN/,
    );
  });
});
