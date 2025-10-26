/**
 * JWT Service Unit Tests
 *
 * Tests for JWT token generation and verification
 * Reference: docs/tests/authentication-tests.md (TC-002)
 */

import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/modules/auth/domain/jwt-service';

describe('JWT Token Generation', () => {
  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const payload = { userId: 'user_123', email: 'test@example.com' };
      const token = generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include user data in token', () => {
      const payload = { userId: 'user_123', email: 'test@example.com' };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe('user_123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should include expiration time', () => {
      const payload = { userId: 'user_123' };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should include issued at time', () => {
      const payload = { userId: 'user_123' };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.iat).toBeDefined();
      expect(decoded.iat).toBeLessThanOrEqual(Date.now() / 1000);
    });

    it('should set correct token type', () => {
      const payload = { userId: 'user_123' };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.type).toBe('access');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const payload = { userId: 'user_123' };
      const token = generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should have longer expiration than access token', () => {
      const payload = { userId: 'user_123' };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      const accessDecoded = verifyAccessToken(accessToken);
      const refreshDecoded = verifyRefreshToken(refreshToken);

      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });

    it('should set correct token type', () => {
      const payload = { userId: 'user_123' };
      const token = generateRefreshToken(payload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const payload = { userId: 'user_123', email: 'test@example.com' };
      const token = generateAccessToken(payload);

      expect(() => verifyAccessToken(token)).not.toThrow();
    });

    it('should reject invalid token format', () => {
      expect(() => verifyAccessToken('invalid.token')).toThrow();
    });

    it('should reject refresh token as access token', () => {
      const payload = { userId: 'user_123' };
      const refreshToken = generateRefreshToken(payload);

      expect(() => verifyAccessToken(refreshToken)).toThrow('Invalid token type');
    });

    it('should reject expired token', () => {
      // Mock time manipulation
      jest.useFakeTimers();
      const token = generateAccessToken({ userId: 'user_123' });

      // Advance time by 16 minutes (access token expires in 15 minutes)
      jest.advanceTimersByTime(16 * 60 * 1000);

      expect(() => verifyAccessToken(token)).toThrow('Token expired');
      jest.useRealTimers();
    });

    it('should reject token with invalid signature', () => {
      const token = generateAccessToken({ userId: 'user_123' });
      const parts = token.split('.');
      const tamperedToken = parts[0] + '.' + parts[1] + '.tampered';

      expect(() => verifyAccessToken(tamperedToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const payload = { userId: 'user_123' };
      const token = generateRefreshToken(payload);

      expect(() => verifyRefreshToken(token)).not.toThrow();
    });

    it('should reject access token as refresh token', () => {
      const payload = { userId: 'user_123', email: 'test@example.com' };
      const accessToken = generateAccessToken(payload);

      expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid token type');
    });

    it('should reject expired refresh token', () => {
      jest.useFakeTimers();
      const token = generateRefreshToken({ userId: 'user_123' });

      // Advance time by 31 days (refresh token expires in 30 days)
      jest.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

      expect(() => verifyRefreshToken(token)).toThrow('Token expired');
      jest.useRealTimers();
    });
  });

  describe('Security', () => {
    it('should generate different tokens for same payload', () => {
      const payload = { userId: 'user_123' };
      const token1 = generateAccessToken(payload);
      const token2 = generateAccessToken(payload);

      // Tokens should be different due to different iat timestamps
      expect(token1).not.toBe(token2);
    });

    it('should not include sensitive data in payload', () => {
      const payload = {
        userId: 'user_123',
        email: 'test@example.com',
        password: 'should-not-be-here' // This should be filtered out
      };

      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.password).toBeUndefined();
    });

    it('should use HS256 algorithm', () => {
      const token = generateAccessToken({ userId: 'user_123' });
      const header = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64').toString()
      );

      expect(header.alg).toBe('HS256');
    });
  });
});
