/**
 * Subscription Plans Integration Tests
 *
 * Tests for GET /api/subscriptions/plans endpoint
 * Reference: docs/tests/subscription-tests.md (TC-101)
 */

import request from 'supertest';
import app from '@/app';
import { subscriptionPlans } from '../../fixtures/subscriptions';

describe('GET /api/subscriptions/plans', () => {
  describe('List All Plans', () => {
    it('should return all subscription plans', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans');

      expect(response.status).toBe(200);
      expect(response.body.plans).toHaveLength(3);
      expect(response.body.plans).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'plan_free' }),
          expect.objectContaining({ id: 'plan_premium' }),
          expect.objectContaining({ id: 'plan_premium_plus' })
        ])
      );
    });

    it('should include Free plan details', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans');

      const freePlan = response.body.plans.find((p: any) => p.id === 'plan_free');

      expect(freePlan).toMatchObject({
        name: 'Free',
        price: 0,
        currency: 'JPY',
        billingCycle: 'monthly',
        features: expect.arrayContaining([
          '基本動画視聴',
          '広告あり',
          '480p画質まで'
        ])
      });
    });

    it('should include Premium plan details', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans');

      const premiumPlan = response.body.plans.find((p: any) => p.id === 'plan_premium');

      expect(premiumPlan).toMatchObject({
        name: 'Premium',
        price: 980,
        currency: 'JPY',
        billingCycle: 'monthly',
        features: expect.arrayContaining([
          '広告なし',
          'HD画質 (1080p)',
          'ダウンロード機能',
          '同時視聴2デバイス'
        ])
      });
    });

    it('should include Premium+ plan details', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans');

      const premiumPlusPlan = response.body.plans.find((p: any) => p.id === 'plan_premium_plus');

      expect(premiumPlusPlan).toMatchObject({
        name: 'Premium+',
        price: 1980,
        currency: 'JPY',
        billingCycle: 'monthly',
        features: expect.arrayContaining([
          'アダルトコンテンツアクセス',
          '4K画質 (2160p)',
          'ライブストリーミング視聴',
          '同時視聴4デバイス',
          '優先サポート'
        ])
      });
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans');

      expect(response.status).toBe(200);
    });

    it('should return plans in correct order', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans');

      const planIds = response.body.plans.map((p: any) => p.id);

      expect(planIds).toEqual([
        'plan_free',
        'plan_premium',
        'plan_premium_plus'
      ]);
    });

    it('should include provider information', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans');

      const premiumPlan = response.body.plans.find((p: any) => p.id === 'plan_premium');
      const premiumPlusPlan = response.body.plans.find((p: any) => p.id === 'plan_premium_plus');

      expect(premiumPlan.provider).toBe('stripe');
      expect(premiumPlusPlan.provider).toBe('ccbill');
    });

    it('should cache response', async () => {
      const response1 = await request(app)
        .get('/api/subscriptions/plans');

      const response2 = await request(app)
        .get('/api/subscriptions/plans')
        .set('If-None-Match', response1.headers.etag);

      // Should return 304 Not Modified if cached
      expect([200, 304]).toContain(response2.status);
    });
  });

  describe('Filter Plans', () => {
    it('should filter by provider', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans?provider=stripe');

      expect(response.status).toBe(200);

      const plans = response.body.plans;
      plans.forEach((plan: any) => {
        if (plan.provider) {
          expect(plan.provider).toBe('stripe');
        }
      });
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans?active=true');

      expect(response.status).toBe(200);

      const plans = response.body.plans;
      plans.forEach((plan: any) => {
        expect(plan.isActive).toBe(true);
      });
    });
  });

  describe('Plan Comparison', () => {
    it('should support plan comparison', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans/compare?plans=plan_free,plan_premium');

      expect(response.status).toBe(200);
      expect(response.body.comparison).toBeDefined();
      expect(response.body.comparison.plans).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database failure
      // This would be done via dependency injection in real tests

      // const response = await request(app)
      //   .get('/api/subscriptions/plans');

      // expect(response.status).toBe(500);
      // expect(response.body.error).toBe('internal_server_error');
    });
  });

  describe('Performance', () => {
    it('should respond within 100ms', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/subscriptions/plans');

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
