import { validateCreatorEligibility } from '@/lib/creator/validation';

describe('Creator Eligibility Validation', () => {
  it('should accept eligible user (30+ days, 10+ videos)', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      email_verified: true,
      video_count: 10
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(true);
  });

  it('should accept user with exactly 7 days old account', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      email_verified: true,
      video_count: 5
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(true);
  });

  it('should accept user with verified email', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      email_verified: true,
      video_count: 3
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(true);
  });
});

describe('Creator Eligibility Validation - Error Cases', () => {
  it('should reject user with account less than 7 days old', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      email_verified: true,
      video_count: 10
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('account_too_new');
  });

  it('should reject user without email verification', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      email_verified: false,
      video_count: 10
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('email_not_verified');
  });
});
