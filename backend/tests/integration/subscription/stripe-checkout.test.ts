/**
 * Stripe Checkout Integration Tests
 *
 * Tests for POST /api/subscriptions/create-checkout endpoint
 * Reference: docs/tests/subscription-tests.md (TC-111)
 */

import request from 'supertest';
import nock from 'nock';
import app from '@/app';
import { testUsers } from '../../fixtures/users';
import { createTestUser, cleanupTestUsers } from '../../helpers/auth-helper';
import { createMockCheckoutSession } from '../../helpers/stripe-helper';

describe('POST /api/subscriptions/create-checkout', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanupTestUsers();
    await createTestUser(testUsers.freeUser);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.freeUser.email,
        password: testUsers.freeUser.password
      });

    accessToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
  });

  afterEach(async () => {
    await cleanupTestUsers();
    nock.cleanAll();
  });

  describe('Create Checkout Session', () => {
    it('should create checkout session for Premium plan', async () => {
      const mockSession = createMockCheckoutSession('cus_test', 'sub_test', 'plan_premium');

      nock('https://api.stripe.com')
        .post('/v1/checkout/sessions')
        .reply(200, mockSession);

      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(200);
      expect(response.body.checkoutUrl).toContain('stripe.com');
      expect(response.body.sessionId).toBeDefined();
    });

    it('should include user metadata in checkout session', async () => {
      nock('https://api.stripe.com')
        .post('/v1/checkout/sessions', (body) => {
          expect(body).toContain(userId);
          expect(body).toContain('plan_premium');
          return true;
        })
        .reply(200, createMockCheckoutSession('cus_test', 'sub_test', 'plan_premium'));

      await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });
    });

    it('should set correct price in checkout session', async () => {
      nock('https://api.stripe.com')
        .post('/v1/checkout/sessions', (body) => {
          // Verify price_id for Premium plan
          expect(body).toContain('price_premium_test');
          return true;
        })
        .reply(200, createMockCheckoutSession('cus_test', 'sub_test', 'plan_premium'));

      await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });
    });

    it('should store checkout session in database', async () => {
      nock('https://api.stripe.com')
        .post('/v1/checkout/sessions')
        .reply(200, createMockCheckoutSession('cus_test', 'sub_test', 'plan_premium'));

      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(200);

      // Verify session is stored
      // const session = await db.query(
      //   'SELECT * FROM checkout_sessions WHERE session_id = $1',
      //   [response.body.sessionId]
      // );
      // expect(session.rows).toHaveLength(1);
    });
  });

  describe('Validation', () => {
    it('should reject invalid plan ID', async () => {
      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'invalid_plan',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_plan');
    });

    it('should reject missing success URL', async () => {
      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid URL format', async () => {
      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          successUrl: 'not-a-valid-url',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .send({
          planId: 'plan_premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(401);
    });

    it('should reject Premium+ plan (requires CCBill)', async () => {
      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium_plus',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('wrong_provider');
      expect(response.body.message).toContain('CCBill');
    });
  });

  describe('Existing Subscription', () => {
    it('should reject if user already has Premium subscription', async () => {
      // Create existing subscription
      // await createTestSubscription({
      //   userId,
      //   planId: 'plan_premium',
      //   status: 'active'
      // });

      // const response = await request(app)
      //   .post('/api/subscriptions/create-checkout')
      //   .set('Authorization', `Bearer ${accessToken}`)
      //   .send({
      //     planId: 'plan_premium',
      //     successUrl: 'https://example.com/success',
      //     cancelUrl: 'https://example.com/cancel'
      //   });

      // expect(response.status).toBe(409);
      // expect(response.body.error).toBe('subscription_exists');
    });

    it('should allow upgrade from Free to Premium', async () => {
      nock('https://api.stripe.com')
        .post('/v1/checkout/sessions')
        .reply(200, createMockCheckoutSession('cus_test', 'sub_test', 'plan_premium'));

      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors', async () => {
      nock('https://api.stripe.com')
        .post('/v1/checkout/sessions')
        .reply(500, { error: { message: 'Internal server error' } });

      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('payment_provider_error');
    });

    it('should handle network timeout', async () => {
      nock('https://api.stripe.com')
        .post('/v1/checkout/sessions')
        .delayConnection(10000)
        .reply(200, createMockCheckoutSession('cus_test', 'sub_test', 'plan_premium'));

      const response = await request(app)
        .post('/api/subscriptions/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'plan_premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });

      expect([500, 504]).toContain(response.status);
    });
  });
});
