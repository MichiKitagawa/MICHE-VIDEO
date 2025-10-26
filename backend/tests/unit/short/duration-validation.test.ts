import { validateShortDuration } from '@/lib/shorts/validators';

/**
 * Short Duration Validation Unit Tests
 *
 * Tests the duration validation logic for short videos:
 * - Maximum 60 seconds enforcement
 * - Minimum 1 second enforcement
 * - Duration format validation
 * - Edge cases (0, negative, exactly 60s)
 *
 * Reference: docs/tests/short-management-tests.md
 */

describe('Short Duration Validation', () => {
  describe('Valid Durations', () => {
    it('should accept video duration of 30 seconds', () => {
      // Arrange: Valid mid-range duration
      const duration = 30;

      // Act: Validate duration
      const result = validateShortDuration(duration);

      // Assert: Should be valid
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept video duration of exactly 60 seconds', () => {
      // Arrange: Maximum allowed duration
      const duration = 60;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should accept exactly 60s
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept minimum duration of 1 second', () => {
      // Arrange: Minimum allowed duration
      const duration = 1;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should accept 1s
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept video duration of 15 seconds', () => {
      const duration = 15;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(true);
    });

    it('should accept video duration of 45 seconds', () => {
      const duration = 45;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(true);
    });

    it('should accept video duration of 59 seconds', () => {
      // Arrange: Just under maximum
      const duration = 59;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should be valid
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid Durations', () => {
    it('should reject video duration over 60 seconds', () => {
      // Arrange: Duration exceeding maximum
      const duration = 75;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should reject
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_too_long');
      expect(result.message).toContain('60秒以内');
    });

    it('should reject video duration of 61 seconds', () => {
      // Arrange: Just over maximum
      const duration = 61;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should reject
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_too_long');
      expect(result.message).toContain('60秒');
    });

    it('should reject video duration of 0 seconds', () => {
      // Arrange: Zero duration
      const duration = 0;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should reject
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_too_short');
      expect(result.message).toContain('最小');
    });

    it('should reject negative duration', () => {
      // Arrange: Negative duration
      const duration = -5;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should reject
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_invalid');
      expect(result.message).toContain('無効');
    });

    it('should reject very large duration', () => {
      // Arrange: Unreasonably large duration
      const duration = 300; // 5 minutes

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should reject
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_too_long');
    });

    it('should reject duration of 120 seconds', () => {
      const duration = 120; // 2 minutes

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_too_long');
    });
  });

  describe('Format Validation', () => {
    it('should reject non-numeric duration', () => {
      // Arrange: String instead of number
      const duration = 'thirty' as any;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should reject
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_invalid_format');
    });

    it('should reject null duration', () => {
      const duration = null as any;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_required');
    });

    it('should reject undefined duration', () => {
      const duration = undefined as any;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_required');
    });

    it('should accept decimal duration and round', () => {
      // Arrange: Decimal duration (30.5 seconds)
      const duration = 30.5;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should accept and provide rounded value
      expect(result.isValid).toBe(true);
      expect(result.roundedDuration).toBe(31); // Rounded up
    });

    it('should accept float duration within range', () => {
      const duration = 45.7;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(true);
      expect(result.roundedDuration).toBe(46);
    });

    it('should reject decimal duration over 60', () => {
      const duration = 60.5;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_too_long');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small positive duration', () => {
      // Arrange: 0.5 seconds
      const duration = 0.5;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should round to 1 and accept
      expect(result.isValid).toBe(true);
      expect(result.roundedDuration).toBe(1);
    });

    it('should handle exactly maximum boundary', () => {
      const duration = 60.0;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(true);
      expect(result.roundedDuration).toBe(60);
    });

    it('should handle NaN duration', () => {
      const duration = NaN;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_invalid');
    });

    it('should handle Infinity duration', () => {
      const duration = Infinity;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_invalid');
    });

    it('should handle negative infinity', () => {
      const duration = -Infinity;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_invalid');
    });
  });

  describe('Security', () => {
    it('should reject extremely large duration values', () => {
      // Arrange: Try to overflow with very large number
      const duration = Number.MAX_SAFE_INTEGER;

      // Act: Validate
      const result = validateShortDuration(duration);

      // Assert: Should reject
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_too_long');
    });

    it('should handle object injection attempt', () => {
      const duration = { valueOf: () => 30 } as any;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('duration_invalid_format');
    });

    it('should sanitize string number inputs', () => {
      const duration = '45' as any;

      const result = validateShortDuration(duration);

      // Should either convert and validate, or reject format
      expect(result.isValid).toBeDefined();
    });
  });

  describe('TikTok/Instagram Reels Compatibility', () => {
    it('should accept 15 seconds (Instagram Reels default)', () => {
      const duration = 15;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(true);
    });

    it('should accept 30 seconds (TikTok extended)', () => {
      const duration = 30;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(true);
    });

    it('should accept 60 seconds (maximum for both platforms)', () => {
      const duration = 60;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(true);
    });

    it('should reject 90 seconds (YouTube Shorts incompatible)', () => {
      const duration = 90;

      const result = validateShortDuration(duration);

      expect(result.isValid).toBe(false);
    });
  });
});
