import request from 'supertest';
import app from '@/app';

/**
 * Earnings Statistics API Integration Tests
 * Tests GET /api/earnings/stats endpoint
 * Reference: docs/tests/monetization-tests.md (TC-103)
 */

describe('GET /api/earnings/stats', () => {
  let creatorToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    const creatorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = creatorRes.body.access_token;

    const viewerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@example.com', password: 'TestPass123!' });
    viewerToken = viewerRes.body.access_token;
  });

  describe('Successful Retrieval', () => {
    it('should retrieve earnings statistics for creator', async () => {
      const response = await request(app)
        .get('/api/earnings/stats')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.available_balance).toBeGreaterThanOrEqual(0);
      expect(response.body.pending_balance).toBeGreaterThanOrEqual(0);
      expect(response.body.this_month_earnings).toBeGreaterThanOrEqual(0);
      expect(response.body.total_withdrawn).toBeGreaterThanOrEqual(0);
      expect(response.body.breakdown).toBeDefined();
      expect(response.body.breakdown.tips).toBeGreaterThanOrEqual(0);
      expect(response.body.breakdown.superchat).toBeGreaterThanOrEqual(0);
      expect(response.body.breakdown.subscription_pool).toBeGreaterThanOrEqual(0);
      expect(response.body.earnings_timeline).toBeInstanceOf(Array);
    });

    it('should show correct breakdown by source type', async () => {
      const response = await request(app)
        .get('/api/earnings/stats')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      const { tips, superchat, subscription_pool } = response.body.breakdown;
      expect(tips + superchat + subscription_pool).toBeLessThanOrEqual(
        response.body.available_balance + response.body.pending_balance
      );
    });
  });

  describe('Authorization', () => {
    it('should reject non-creator access', async () => {
      const response = await request(app)
        .get('/api/earnings/stats')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('creator_only');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/earnings/stats');

      expect(response.status).toBe(401);
    });
  });

  describe('Performance', () => {
    it('should retrieve stats within 500ms', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/earnings/stats')
        .set('Authorization', `Bearer ${creatorToken}`);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });
});
