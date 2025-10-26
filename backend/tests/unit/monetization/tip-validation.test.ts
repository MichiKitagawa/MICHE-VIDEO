/**
 * Tip Validation Unit Tests
 *
 * Tests for tip amount and message validation
 * Reference: docs/tests/monetization-tests.md (TC-005)
 */

import { validateTipAmount, validateTipMessage } from '@/lib/monetization/validation';

describe('Tip Amount Validation', () => {
  describe('Valid Amounts', () => {
    it('should accept minimum tip amount (¥100)', () => {
      expect(() => validateTipAmount(100)).not.toThrow();
    });

    it('should accept maximum tip amount (¥100,000)', () => {
      expect(() => validateTipAmount(100000)).not.toThrow();
    });

    it('should accept mid-range tip amounts', () => {
      const validAmounts = [500, 1000, 5000, 10000, 50000];

      validAmounts.forEach(amount => {
        expect(() => validateTipAmount(amount)).not.toThrow();
      });
    });

    it('should accept common tip increments', () => {
      const amounts = [100, 500, 1000, 3000, 5000, 10000];

      amounts.forEach(amount => {
        expect(() => validateTipAmount(amount)).not.toThrow();
      });
    });
  });

  describe('Invalid Amounts - Below Minimum', () => {
    it('should reject tip amount below minimum (¥100)', () => {
      expect(() => validateTipAmount(50)).toThrow('最小投げ銭額は¥100です');
    });

    it('should reject ¥99', () => {
      expect(() => validateTipAmount(99)).toThrow('最小投げ銭額は¥100です');
    });

    it('should reject ¥1', () => {
      expect(() => validateTipAmount(1)).toThrow('最小投げ銭額は¥100です');
    });

    it('should reject zero amount', () => {
      expect(() => validateTipAmount(0)).toThrow('最小投げ銭額は¥100です');
    });

    it('should reject negative amount', () => {
      expect(() => validateTipAmount(-100)).toThrow('最小投げ銭額は¥100です');
    });
  });

  describe('Invalid Amounts - Above Maximum', () => {
    it('should reject tip amount above maximum (¥100,000)', () => {
      expect(() => validateTipAmount(150000)).toThrow('最大投げ銭額は¥100,000です');
    });

    it('should reject ¥100,001', () => {
      expect(() => validateTipAmount(100001)).toThrow('最大投げ銭額は¥100,000です');
    });

    it('should reject very large amounts', () => {
      expect(() => validateTipAmount(1000000)).toThrow('最大投げ銭額は¥100,000です');
    });
  });

  describe('Currency Validation', () => {
    it('should reject non-integer amounts', () => {
      expect(() => validateTipAmount(100.50)).toThrow('整数の金額が必要です');
    });

    it('should reject decimal amounts', () => {
      expect(() => validateTipAmount(999.99)).toThrow('整数の金額が必要です');
    });

    it('should accept integer amounts only', () => {
      expect(() => validateTipAmount(1000)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null or undefined', () => {
      expect(() => validateTipAmount(null as any)).toThrow();
      expect(() => validateTipAmount(undefined as any)).toThrow();
    });

    it('should handle NaN', () => {
      expect(() => validateTipAmount(NaN)).toThrow();
    });

    it('should handle string input', () => {
      expect(() => validateTipAmount('1000' as any)).toThrow('金額は数値である必要があります');
    });

    it('should handle Infinity', () => {
      expect(() => validateTipAmount(Infinity)).toThrow();
    });
  });
});

describe('Tip Message Validation', () => {
  describe('Valid Messages', () => {
    it('should accept empty message (optional)', () => {
      expect(() => validateTipMessage('')).not.toThrow();
    });

    it('should accept undefined message (optional)', () => {
      expect(() => validateTipMessage(undefined)).not.toThrow();
    });

    it('should accept short message', () => {
      expect(() => validateTipMessage('ありがとう！')).not.toThrow();
    });

    it('should accept message at maximum length (200 characters)', () => {
      const maxMessage = 'a'.repeat(200);
      expect(() => validateTipMessage(maxMessage)).not.toThrow();
    });

    it('should accept Japanese characters', () => {
      expect(() => validateTipMessage('素晴らしい動画でした！')).not.toThrow();
    });

    it('should accept emoji in message', () => {
      expect(() => validateTipMessage('最高です！🎉👏')).not.toThrow();
    });

    it('should accept newlines in message', () => {
      expect(() => validateTipMessage('素晴らしい動画でした！\nありがとうございます。')).not.toThrow();
    });
  });

  describe('Invalid Messages - Too Long', () => {
    it('should reject message exceeding 200 characters', () => {
      const longMessage = 'a'.repeat(201);
      expect(() => validateTipMessage(longMessage)).toThrow('メッセージは200文字以内です');
    });

    it('should reject very long messages', () => {
      const veryLongMessage = 'あ'.repeat(500);
      expect(() => validateTipMessage(veryLongMessage)).toThrow('メッセージは200文字以内です');
    });

    it('should count Japanese characters correctly', () => {
      const japaneseMessage = 'あ'.repeat(201);
      expect(() => validateTipMessage(japaneseMessage)).toThrow('メッセージは200文字以内です');
    });

    it('should count emoji as characters', () => {
      const emojiMessage = '🎉'.repeat(201);
      expect(() => validateTipMessage(emojiMessage)).toThrow('メッセージは200文字以内です');
    });
  });

  describe('Security - XSS Prevention', () => {
    it('should sanitize HTML script tags', () => {
      const result = validateTipMessage('<script>alert("XSS")</script>応援しています！');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toContain('応援しています！');
    });

    it('should sanitize img tags with onerror', () => {
      const result = validateTipMessage('<img src=x onerror="alert(1)">メッセージ');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('<img');
    });

    it('should remove potentially dangerous HTML', () => {
      const result = validateTipMessage('<iframe src="evil.com"></iframe>');
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('</iframe>');
    });

    it('should allow safe text content', () => {
      const result = validateTipMessage('これは安全なメッセージです');
      expect(result).toBe('これは安全なメッセージです');
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only message', () => {
      expect(() => validateTipMessage('   ')).not.toThrow();
    });

    it('should handle null', () => {
      expect(() => validateTipMessage(null as any)).not.toThrow();
    });

    it('should preserve spacing in message', () => {
      const message = '素晴らしい   動画   でした！';
      const result = validateTipMessage(message);
      expect(result).toBe(message);
    });

    it('should handle special characters', () => {
      const message = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(() => validateTipMessage(message)).not.toThrow();
    });
  });

  describe('Message Content Validation', () => {
    it('should accept alphanumeric with Japanese', () => {
      const message = 'Test123 テスト456';
      expect(() => validateTipMessage(message)).not.toThrow();
    });

    it('should accept URLs in message', () => {
      const message = 'Check out https://example.com';
      expect(() => validateTipMessage(message)).not.toThrow();
    });

    it('should accept line breaks', () => {
      const message = 'Line 1\nLine 2\nLine 3';
      expect(() => validateTipMessage(message)).not.toThrow();
    });

    it('should handle mixed content', () => {
      const message = '素晴らしい動画！🎉\nThank you 123';
      expect(() => validateTipMessage(message)).not.toThrow();
    });
  });
});
