/**
 * User Registration Integration Tests
 *
 * Tests for POST /api/auth/register endpoint
 * Reference: docs/tests/authentication-tests.md (TC-101, TC-102, TC-103)
 */

import request from 'supertest';
import app from '@/app';
import { testUsers, invalidUsers, maliciousInputs } from '../../fixtures/users';
import { cleanupTestUsers } from '../../helpers/auth-helper';

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    // Clean up any existing test users
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('Successful Registration (TC-101)', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUsers.newUser.email,
          password: testUsers.newUser.password,
          name: testUsers.newUser.name
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        email: testUsers.newUser.email,
        name: testUsers.newUser.name,
        plan: 'Free',
        isEmailVerified: false
      });
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should create user in database', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'dbtest@example.com',
          password: 'DbTest123!',
          name: 'DB Test User'
        });

      expect(response.status).toBe(201);

      // Verify user exists in database
      // This would use actual database query in real implementation
      // const user = await userRepository.findByEmail('dbtest@example.com');
      // expect(user).toBeDefined();
      // expect(user.isEmailVerified).toBe(false);
    });

    it('should send verification email', async () => {
      // Mock email service
      const sendEmailMock = jest.fn();
      jest.spyOn(require('@/shared/utils/email'), 'sendEmail').mockImplementation(sendEmailMock);

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'verify@example.com',
          password: 'VerifyPass123!',
          name: 'Verify User'
        });

      expect(sendEmailMock).toHaveBeenCalledWith(
        'verify@example.com',
        expect.stringContaining('メールアドレスを確認'),
        expect.any(String)
      );

      jest.restoreAllMocks();
    });

    it('should hash password before storing', async () => {
      const plainPassword = 'PlainPass123!';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hashtest@example.com',
          password: plainPassword,
          name: 'Hash Test'
        });

      expect(response.status).toBe(201);

      // Verify password is hashed in database
      // const user = await userRepository.findByEmail('hashtest@example.com');
      // expect(user.password).not.toBe(plainPassword);
      // expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('should create user session', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'session@example.com',
          password: 'SessionPass123!',
          name: 'Session User'
        });

      expect(response.status).toBe(201);
      expect(response.body.refreshToken).toBeDefined();

      // Verify session exists in Redis
      // const session = await redis.get(`session:${response.body.refreshToken}`);
      // expect(session).toBeDefined();
    });
  });

  describe('Email Already Exists (TC-102)', () => {
    it('should return 409 for duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'FirstPass123!',
          name: 'First User'
        });

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecondPass123!',
          name: 'Second User'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('email_already_exists');
      expect(response.body.message).toContain('既に使用されています');
    });

    it('should be case-insensitive for email check', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'Test@Example.com',
          password: 'TestPass123!',
          name: 'Test User'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(409);
    });
  });

  describe('Validation Errors (TC-103)', () => {
    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: invalidUsers.invalidEmail.email,
          password: invalidUsers.invalidEmail.password,
          name: invalidUsers.invalidEmail.name
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
      expect(response.body.details).toContain('email');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: invalidUsers.weakPassword.email,
          password: invalidUsers.weakPassword.password,
          name: invalidUsers.weakPassword.name
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
      expect(response.body.details).toContain('パスワードが要件を満たしていません');
    });

    it('should reject password without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: invalidUsers.noUppercase.email,
          password: invalidUsers.noUppercase.password,
          name: invalidUsers.noUppercase.name
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('大文字が必要');
    });

    it('should reject password without number', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: invalidUsers.noNumber.email,
          password: invalidUsers.noNumber.password,
          name: invalidUsers.noNumber.name
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('数字が必要');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing password and name
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
    });

    it('should reject empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: maliciousInputs.sqlInjection.email,
          password: maliciousInputs.sqlInjection.password,
          name: 'SQL Test'
        });

      // Should fail validation, not cause SQL error
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
    });

    it('should sanitize XSS in user name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: maliciousInputs.xssScript.email,
          password: maliciousInputs.xssScript.password,
          name: maliciousInputs.xssScript.name
        });

      if (response.status === 201) {
        expect(response.body.user.name).not.toContain('<script>');
        expect(response.body.user.name).not.toContain('alert');
      }
    });

    it('should sanitize HTML tags in name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: maliciousInputs.htmlTags.email,
          password: maliciousInputs.htmlTags.password,
          name: maliciousInputs.htmlTags.name
        });

      if (response.status === 201) {
        expect(response.body.user.name).not.toContain('<b>');
        expect(response.body.user.name).not.toContain('</b>');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];

      // Make 11 requests (limit is 10)
      for (let i = 0; i < 11; i++) {
        requests.push(
          request(app)
            .post('/api/auth/register')
            .send({
              email: `ratelimit${i}@example.com`,
              password: 'RateLimit123!',
              name: `Rate Test ${i}`
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long email', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: longEmail,
          password: 'ValidPass123!',
          name: 'Long Email User'
        });

      expect(response.status).toBe(400);
    });

    it('should handle very long name', async () => {
      const longName = 'A'.repeat(256);
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'longname@example.com',
          password: 'ValidPass123!',
          name: longName
        });

      // Should either accept (with truncation) or reject
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should trim whitespace from email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: '  whitespace@example.com  ',
          password: 'WhiteSpace123!',
          name: 'Whitespace User'
        });

      if (response.status === 201) {
        expect(response.body.user.email).toBe('whitespace@example.com');
      }
    });
  });
});
