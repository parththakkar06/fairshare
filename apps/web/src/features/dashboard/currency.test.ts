import { formatInr } from '@/features/dashboard/currency';

describe('formatInr', () => {
  it('formats dashboard values in the fixed INR currency', () => {
    expect(formatInr(1234.5)).toContain('1,234.50');
    expect(formatInr(1234.5)).toMatch(/₹|INR/);
  });
});
