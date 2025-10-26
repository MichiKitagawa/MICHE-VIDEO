import { checkPlanAccess } from '@/lib/netflix/access';

describe('Netflix Plan Access Check', () => {
  it('should grant access for Premium plan', () => {
    const result = checkPlanAccess('premium');

    expect(result.hasAccess).toBe(true);
  });

  it('should grant access for Premium+ plan', () => {
    const result = checkPlanAccess('premium_plus');

    expect(result.hasAccess).toBe(true);
  });

  it('should deny access for Free plan', () => {
    const result = checkPlanAccess('free');

    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('premium_required');
    expect(result.upgradePlan).toBe('premium');
  });
});
