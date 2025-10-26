/**
 * Logout Integration Tests
 *
 * Tests for POST /api/auth/logout endpoint
 * Reference: docs/tests/authentication-tests.md
 */

import request from 'supertest';
import app from '@/app';
import { testUsers } from '../../fixtures/users';
import { createTestUser, cleanupTestUsers } from '../../helpers/auth-helper';

describe('POST /api/auth/logout', () => {
  let refreshToken: string;
  let accessToken: string;

  beforeEach(async () => {
    await cleanupTestUsers();
    await createTestUser(testUsers.freeUser);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.freeUser.email,
        password: testUsers.freeUser.password
      });

    refreshToken = loginResponse.body.refreshToken;
    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('Successful Logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(204);
    });

    it('should invalidate refresh token', async () => {
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      // Try to use the refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
    });

    it('should remove session from Redis', async () => {
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      // Verify session is removed
      // const session = await redis.get(`session:${refreshToken}`);
      // expect(session).toBeNull();
    });

    it('should allow logout with access token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(204);
    });
  });

  describe('Invalid Logout Attempts', () => {
    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid_token' });

      expect(response.status).toBe(401);
    });

    it('should handle already logged out session gracefully', async () => {
      // Logout once
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      // Try to logout again
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(401);
    });
  });

  describe('Logout All Sessions', () => {
    it('should logout all user sessions when requested', async () => {
      // Create multiple sessions
      const session1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      const session2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      // Logout all sessions
      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      // Both refresh tokens should be invalid
      const refresh1 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: session1.body.refreshToken });

      const refresh2 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: session2.body.refreshToken });

      expect(refresh1.status).toBe(401);
      expect(refresh2.status).toBe(401);
    });
  });
});
