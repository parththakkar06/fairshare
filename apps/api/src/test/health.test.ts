import request from 'supertest';

import { createApp } from '../app.js';

describe('GET /api/v1/health', () => {
  it('returns service health without requiring a database connection', async () => {
    const response = await request(
      createApp({ clientOrigin: 'http://localhost:5173', environment: 'test' }),
    ).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'splitwise-api',
    });
    const body = response.body as {
      status: string;
      service: string;
      timestamp: string;
    };

    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });
});
