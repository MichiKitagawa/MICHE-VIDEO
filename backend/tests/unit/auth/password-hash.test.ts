/**
 * Password Hashing Unit Tests
 *
 * Tests for bcrypt password hashing and verification
 * Reference: docs/tests/authentication-tests.md (TC-001)
 */

import { hashPassword, verifyPassword } from '@/modules/auth/domain/password';

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const plainPassword = 'SecurePass123!';
      const hashed = await hashPassword(plainPassword);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(plainPassword);
      expect(hashed).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const plainPassword = 'SecurePass123!';
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);

      expect(hash1).not.toBe(hash2); // Different salts
    });

    it('should handle empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(72); // bcrypt max is 72 bytes
      const hashed = await hashPassword(longPassword);

      expect(hashed).toBeDefined();
      expect(hashed).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const plainPassword = 'SecurePass123!';
      const hashed = await hashPassword(plainPassword);
      const isValid = await verifyPassword(plainPassword, hashed);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hashed = await hashPassword('SecurePass123!');
      const isValid = await verifyPassword('WrongPassword', hashed);

      expect(isValid).toBe(false);
    });

    it('should reject empty password against hash', async () => {
      const hashed = await hashPassword('SecurePass123!');
      const isValid = await verifyPassword('', hashed);

      expect(isValid).toBe(false);
    });

    it('should reject case-sensitive password difference', async () => {
      const hashed = await hashPassword('SecurePass123!');
      const isValid = await verifyPassword('securepass123!', hashed);

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format', async () => {
      await expect(
        verifyPassword('anypassword', 'invalid-hash')
      ).rejects.toThrow();
    });
  });

  describe('Security', () => {
    it('should use cost factor 12 or higher', async () => {
      const plainPassword = 'SecurePass123!';
      const hashed = await hashPassword(plainPassword);

      // Extract cost factor from bcrypt hash
      // Format: $2a$12$... where 12 is the cost
      const costMatch = hashed.match(/^\$2[aby]\$(\d+)\$/);
      expect(costMatch).not.toBeNull();

      const cost = parseInt(costMatch![1]);
      expect(cost).toBeGreaterThanOrEqual(12);
    });

    it('should complete hashing within reasonable time', async () => {
      const start = Date.now();
      await hashPassword('SecurePass123!');
      const duration = Date.now() - start;

      // Should complete within 500ms (cost 12 typically takes 100-300ms)
      expect(duration).toBeLessThan(500);
    });

    it('should be resistant to timing attacks', async () => {
      const hashed = await hashPassword('SecurePass123!');

      const start1 = Date.now();
      await verifyPassword('SecurePass123!', hashed);
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      await verifyPassword('WrongPassword', hashed);
      const duration2 = Date.now() - start2;

      // Both should take similar time (within 50ms)
      expect(Math.abs(duration1 - duration2)).toBeLessThan(50);
    });
  });
});
