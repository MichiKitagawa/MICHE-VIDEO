import { validateSuperChat } from '@/lib/live/superchat-validator';

describe('SuperChat Validation', () => {
  describe('Amount Validation', () => {
    it('should accept amount between ¥100 and ¥100,000', () => {
      const result = validateSuperChat({ amount: 1000, message: 'Test' });
      expect(result.isValid).toBe(true);
    });

    it('should reject amount below ¥100', () => {
      const result = validateSuperChat({ amount: 50, message: 'Test' });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('amount_too_low');
    });

    it('should reject amount above ¥100,000', () => {
      const result = validateSuperChat({ amount: 150000, message: 'Test' });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('amount_too_high');
    });

    it('should accept exactly ¥100', () => {
      expect(validateSuperChat({ amount: 100, message: 'Test' }).isValid).toBe(true);
    });

    it('should accept exactly ¥100,000', () => {
      expect(validateSuperChat({ amount: 100000, message: 'Test' }).isValid).toBe(true);
    });
  });

  describe('Message Validation', () => {
    it('should accept message up to 200 characters', () => {
      const message = 'a'.repeat(200);
      const result = validateSuperChat({ amount: 1000, message });
      expect(result.isValid).toBe(true);
    });

    it('should reject message over 200 characters', () => {
      const message = 'a'.repeat(201);
      const result = validateSuperChat({ amount: 1000, message });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('message_too_long');
    });

    it('should require message', () => {
      const result = validateSuperChat({ amount: 1000, message: '' });
      expect(result.isValid).toBe(false);
    });

    it('should sanitize XSS in message', () => {
      const result = validateSuperChat({ 
        amount: 1000, 
        message: '<script>alert(1)</script>応援' 
      });
      expect(result.isValid).toBe(true);
      expect(result.sanitizedMessage).not.toContain('<script>');
    });
  });
});
