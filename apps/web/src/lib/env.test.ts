import { webEnv } from '@/lib/env';

describe('webEnv', () => {
  it('provides a valid API base URL', () => {
    expect(() => new URL(webEnv.VITE_API_URL)).not.toThrow();
  });
});
