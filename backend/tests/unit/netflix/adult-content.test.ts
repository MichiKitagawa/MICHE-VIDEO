import { validateAdultContentAccess } from '@/lib/netflix/adult-content';

describe('Adult Content Access Validation', () => {
  it('should allow access for Premium+ with age verification', () => {
    const result = validateAdultContentAccess({
      plan: 'premium_plus',
      isAgeVerified: true,
      age: 20
    });

    expect(result.canAccess).toBe(true);
  });

  it('should deny access for Premium+ without age verification', () => {
    const result = validateAdultContentAccess({
      plan: 'premium_plus',
      isAgeVerified: false,
      age: 20
    });

    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe('age_verification_required');
  });

  it('should deny access for underage users', () => {
    const result = validateAdultContentAccess({
      plan: 'premium_plus',
      isAgeVerified: true,
      age: 17
    });

    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe('age_restriction');
  });

  it('should deny access for Premium plan', () => {
    const result = validateAdultContentAccess({
      plan: 'premium',
      isAgeVerified: true,
      age: 20
    });

    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe('premium_plus_required');
  });
});
