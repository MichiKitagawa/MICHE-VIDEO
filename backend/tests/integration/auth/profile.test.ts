/**
 * User Profile Integration Tests
 *
 * Tests for profile endpoints
 * Reference: docs/tests/authentication-tests.md
 */

import request from 'supertest';
import app from '@/app';
import { testUsers } from '../../fixtures/users';
import { createTestUser, cleanupTestUsers } from '../../helpers/auth-helper';

describe('User Profile Endpoints', () => {
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

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: userId,
        email: testUsers.freeUser.email,
        name: testUsers.freeUser.name,
        plan: testUsers.freeUser.plan
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    it('should include subscription information', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.plan).toBeDefined();
      expect(response.body.user.isEmailVerified).toBeDefined();
    });
  });

  describe('PATCH /api/auth/profile', () => {
    it('should update user name', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('Updated Name');
    });

    it('should update user avatar', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          avatarUrl: 'https://example.com/avatar.jpg'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should update multiple fields', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'New Name',
          bio: 'This is my bio'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('New Name');
      expect(response.body.user.bio).toBe('This is my bio');
    });

    it('should not allow updating email', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newemail@example.com'
        });

      // Email update should be rejected or ignored
      expect([400, 200]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.user.email).toBe(testUsers.freeUser.email);
      }
    });

    it('should not allow updating plan', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          plan: 'Premium'
        });

      // Plan update should be rejected
      expect([400, 200]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.user.plan).toBe('Free');
      }
    });

    it('should sanitize XSS in name', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '<script>alert("xss")</script>Hacker'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.name).not.toContain('<script>');
    });

    it('should reject very long name', async () => {
      const longName = 'A'.repeat(256);
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: longName
        });

      expect(response.status).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .send({
          name: 'New Name'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUsers.freeUser.password,
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('パスワードを変更しました');
    });

    it('should allow login with new password', async () => {
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUsers.freeUser.password,
          newPassword: 'NewPassword123!'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: 'NewPassword123!'
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_password');
    });

    it('should validate new password strength', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUsers.freeUser.password,
          newPassword: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
    });

    it('should reject same password as current', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUsers.freeUser.password,
          newPassword: testUsers.freeUser.password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('same_password');
    });

    it('should invalidate all sessions after password change', async () => {
      // Create another session
      const session2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      // Change password
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUsers.freeUser.password,
          newPassword: 'NewPassword123!'
        });

      // Both sessions should be invalid
      const refresh1 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: session2.body.refreshToken });

      expect(refresh1.status).toBe(401);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .send({
          currentPassword: testUsers.freeUser.password,
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(401);
    });
  });
});
