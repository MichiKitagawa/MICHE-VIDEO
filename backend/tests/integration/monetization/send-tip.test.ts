import request from 'supertest';
import app from '@/app';

/**
 * Tip Sending API Integration Tests
 *
 * Tests POST /api/tips/send endpoint
 * Reference: docs/tests/monetization-tests.md (TC-101, TC-102)
 */

describe('POST /api/tips/send', () => {
  let viewerToken: string;
  let creatorToken: string;
  let videoId: string;

  beforeEach(async () => {
    // Setup: Login as viewer
    const viewerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@example.com', password: 'TestPass123!' });
    viewerToken = viewerRes.body.access_token;

    // Setup: Login as creator
    const creatorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = creatorRes.body.access_token;

    // Setup: Create test video
    const videoRes = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ title: 'テスト動画', is_adult: false });
    videoId = videoRes.body.video.id;
  });

  describe('Successful Tip Sending', () => {
    it('should send tip successfully (Stripe)', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000,
          message: '素晴らしい動画でした！'
        });

      expect(response.status).toBe(201);
      expect(response.body.tip).toBeDefined();
      expect(response.body.tip.id).toMatch(/^tip_/);
      expect(response.body.tip.amount).toBe(1000);
      expect(response.body.tip.message).toBe('素晴らしい動画でした！');
      expect(response.body.tip.payment_provider).toBe('stripe');
      expect(response.body.tip.status).toBe('completed');
      expect(response.body.payment.transaction_id).toBeDefined();
      expect(response.body.payment.receipt_url).toContain('stripe.com');
    });

    it('should send tip with minimum amount (¥100)', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 100
        });

      expect(response.status).toBe(201);
      expect(response.body.tip.amount).toBe(100);
    });

    it('should send tip with maximum amount (¥100,000)', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 100000,
          message: '最高の動画をありがとう！'
        });

      expect(response.status).toBe(201);
      expect(response.body.tip.amount).toBe(100000);
    });

    it('should send tip without message (optional)', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 500
        });

      expect(response.status).toBe(201);
      expect(response.body.tip.message).toBeUndefined();
    });

    it('should send tip to short video', async () => {
      const shortRes = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ title: 'テストショート' });

      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: shortRes.body.short.id,
          content_type: 'short',
          amount: 1000
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Validation Errors', () => {
    it('should reject tip below minimum amount', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 50
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_amount');
    });

    it('should reject tip above maximum amount', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 150000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_amount');
    });

    it('should reject message exceeding 200 characters', async () => {
      const longMessage = 'a'.repeat(201);
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000,
          message: longMessage
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('message_too_long');
    });

    it('should reject invalid content_type', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'invalid',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_content_type');
    });

    it('should reject non-existent content', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: 'vid_nonexistent',
          content_type: 'video',
          amount: 1000
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('content_not_found');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting (5 tips per minute)', async () => {
      // Send 5 tips
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/tips/send')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({
            content_id: videoId,
            content_type: 'video',
            amount: 100
          });
      }

      // 6th tip should be rate limited
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 100
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('rate_limit_exceeded');
    });
  });

  describe('Security', () => {
    it('should sanitize message for XSS', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000,
          message: '<script>alert("XSS")</script>応援しています！'
        });

      expect(response.status).toBe(201);
      expect(response.body.tip.message).not.toContain('<script>');
      expect(response.body.tip.message).not.toContain('</script>');
    });

    it('should prevent self-tipping', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('cannot_tip_own_content');
    });
  });

  describe('Payment Provider Selection', () => {
    it('should use Stripe for non-adult content', async () => {
      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000
        });

      expect(response.status).toBe(201);
      expect(response.body.tip.payment_provider).toBe('stripe');
    });

    it('should use CCBill for adult content', async () => {
      const adultVideoRes = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ title: 'アダルト動画', is_adult: true });

      const response = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: adultVideoRes.body.video.id,
          content_type: 'video',
          amount: 1000
        });

      expect(response.status).toBe(201);
      expect(response.body.tip.payment_provider).toBe('ccbill');
    });
  });

  describe('Performance', () => {
    it('should complete tip within 2 seconds', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000
        });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });
});
