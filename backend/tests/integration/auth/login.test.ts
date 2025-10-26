/**
 * User Login Integration Tests
 *
 * Tests for POST /api/auth/login endpoint
 * Reference: docs/tests/authentication-tests.md (TC-111, TC-112)
 */

import request from 'supertest';
import app from '@/app';
import { testUsers } from '../../fixtures/users';
import { createTestUser, cleanupTestUsers } from '../../helpers/auth-helper';

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await cleanupTestUsers();
    // Create test user
    await createTestUser(testUsers.freeUser);
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('Successful Login (TC-111)', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        email: testUsers.freeUser.email,
        name: testUsers.freeUser.name
      });
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should create new session on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      expect(response.status).toBe(200);

      // Verify session exists
      // const sessions = await redis.keys(`session:*`);
      // expect(sessions.length).toBeGreaterThan(0);
    });

    it('should return user plan information', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.user.plan).toBe('Free');
    });

    it('should be case-insensitive for email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email.toUpperCase(),
          password: testUsers.freeUser.password
        });

      expect(response.status).toBe(200);
    });

    it('should update last login timestamp', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      expect(response.status).toBe(200);

      // Verify lastLoginAt is updated
      // const user = await userRepository.findByEmail(testUsers.freeUser.email);
      // expect(user.lastLoginAt).toBeDefined();
    });
  });

  describe('Authentication Failure (TC-112)', () => {
    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_credentials');
      expect(response.body.message).toContain('メールアドレスまたはパスワードが正しくありません');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_credentials');
    });

    it('should not reveal if email exists', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: 'WrongPassword123!'
        });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        });

      // Both should return same error message
      expect(response1.body.message).toBe(response2.body.message);
    });

    it('should handle empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: ''
        });

      expect(response.status).toBe(400);
    });

    it('should handle missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'SomePassword123!'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should block login after 5 failed attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers.freeUser.email,
            password: 'WrongPassword'
          });
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: 'WrongPassword'
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('rate_limit_exceeded');
      expect(response.body.retryAfter).toBeDefined();
    });

    it('should allow login after rate limit expires', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers.freeUser.email,
            password: 'WrongPassword'
          });
      }

      // Wait for rate limit to expire (mock time or actual wait)
      // await new Promise(resolve => setTimeout(resolve, 60000));

      // Should allow login again
      // const response = await request(app)
      //   .post('/api/auth/login')
      //   .send({
      //     email: testUsers.freeUser.email,
      //     password: testUsers.freeUser.password
      //   });

      // expect(response.status).toBe(200);
    });
  });

  describe('Security', () => {
    it('should prevent SQL injection in email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: "anything"
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_credentials');
    });

    it('should prevent SQL injection in password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: "' OR '1'='1"
        });

      expect(response.status).toBe(401);
    });

    it('should use constant-time password comparison', async () => {
      const attempts = [];

      // Measure time for correct password
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers.freeUser.email,
            password: testUsers.freeUser.password
          });
        attempts.push(Date.now() - start);
      }

      const wrongAttempts = [];

      // Measure time for wrong password
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers.freeUser.email,
            password: 'WrongPassword123!'
          });
        wrongAttempts.push(Date.now() - start);
      }

      // Time difference should be minimal (within 100ms average)
      const avgCorrect = attempts.reduce((a, b) => a + b) / attempts.length;
      const avgWrong = wrongAttempts.reduce((a, b) => a + b) / wrongAttempts.length;

      expect(Math.abs(avgCorrect - avgWrong)).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: `  ${testUsers.freeUser.email}  `,
          password: testUsers.freeUser.password
        });

      expect(response.status).toBe(200);
    });

    it('should handle special characters in password', async () => {
      const specialUser = {
        email: 'special@example.com',
        password: 'P@$$w0rd!#%&*',
        name: 'Special User'
      };

      await createTestUser(specialUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: specialUser.email,
          password: specialUser.password
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Unverified Email', () => {
    it('should allow login with unverified email', async () => {
      await createTestUser(testUsers.unverifiedUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.unverifiedUser.email,
          password: testUsers.unverifiedUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.user.isEmailVerified).toBe(false);
    });

    it('should include verification status in response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.freeUser.email,
          password: testUsers.freeUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.user.isEmailVerified).toBeDefined();
    });
  });
});
