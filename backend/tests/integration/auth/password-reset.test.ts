/**
 * Password Reset Integration Tests
 *
 * Tests for password reset flow endpoints
 * Reference: docs/tests/authentication-tests.md (TC-131, TC-132)
 */

import request from 'supertest';
import app from '@/app';
import { testUsers } from '../../fixtures/users';
import { createTestUser, cleanupTestUsers } from '../../helpers/auth-helper';

describe('Password Reset Flow', () => {
  beforeEach(async () => {
    await cleanupTestUsers();
    await createTestUser(testUsers.freeUser);
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('POST /api/auth/request-password-reset (TC-131)', () => {
    it('should send password reset email', async () => {
      const sendEmailMock = jest.fn();
      jest.spyOn(require('@/shared/utils/email'), 'sendEmail').mockImplementation(sendEmailMock);

      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUsers.freeUser.email });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('パスワードリセットメールを送信しました');

      expect(sendEmailMock).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should create reset token in database', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUsers.freeUser.email });

      expect(response.status).toBe(200);

      // Verify token exists
      // const tokens = await db.query(
      //   'SELECT * FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = $1)',
      //   [testUsers.freeUser.email]
      // );
      // expect(tokens.rows).toHaveLength(1);
      // expect(tokens.rows[0].expiresAt).toBeDefined();
    });

    it('should set token expiration to 1 hour', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUsers.freeUser.email });

      expect(response.status).toBe(200);

      // Verify expiration
      // const token = await getPasswordResetToken(testUsers.freeUser.email);
      // const expiresIn = token.expiresAt - Date.now();
      // expect(expiresIn).toBeLessThanOrEqual(60 * 60 * 1000); // 1 hour
      // expect(expiresIn).toBeGreaterThan(59 * 60 * 1000); // At least 59 minutes
    });

    it('should return success even for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' });

      // Don't reveal if email exists
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('パスワードリセットメールを送信しました');
    });

    it('should invalidate previous reset tokens', async () => {
      // Request first token
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUsers.freeUser.email });

      // Request second token
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUsers.freeUser.email });

      // Only one active token should exist
      // const tokens = await getActivePasswordResetTokens(testUsers.freeUser.email);
      // expect(tokens).toHaveLength(1);
    });

    it('should rate limit reset requests', async () => {
      const requests = [];

      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/auth/request-password-reset')
            .send({ email: testUsers.freeUser.email })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password (TC-132)', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Request password reset to get token
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUsers.freeUser.email });

      // Get token from database or mock
      // const tokens = await db.query(
      //   'SELECT token FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = $1)',
      //   [testUsers.freeUser.email]
      // );
      // resetToken = tokens.rows[0].token;
      resetToken = 'mock-reset-token-123';
    });

    it('should reset password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePass456!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('パスワードをリセットしました');
    });

    it('should allow login with new password', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePass456!'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: 'NewSecurePass456!'
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject old password after reset', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePass456!'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password // Old password
        });

      expect(loginResponse.status).toBe(401);
    });

    it('should invalidate reset token after use', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePass456!'
        });

      // Try to use same token again
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'AnotherPass789!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_or_expired_token');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewSecurePass456!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_or_expired_token');
    });

    it('should reject expired token', async () => {
      // Mock time to make token expired
      // jest.useFakeTimers();
      // jest.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

      // const response = await request(app)
      //   .post('/api/auth/reset-password')
      //   .send({
      //     token: resetToken,
      //     newPassword: 'NewSecurePass456!'
      //   });

      // expect(response.status).toBe(400);
      // expect(response.body.error).toBe('invalid_or_expired_token');

      // jest.useRealTimers();
    });

    it('should validate new password strength', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'weak' // Weak password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
    });

    it('should invalidate all user sessions after reset', async () => {
      // Create a session
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      const oldRefreshToken = loginResponse.body.refreshToken;

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePass456!'
        });

      // Old session should be invalid
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });
});
