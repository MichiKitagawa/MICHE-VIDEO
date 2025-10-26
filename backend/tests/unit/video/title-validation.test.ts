import { validateVideoTitle } from '@/lib/video/validation';

describe('Video Title Validation', () => {
  describe('Valid Titles', () => {
    it('should accept valid title', () => {
      const result = validateVideoTitle('プログラミング入門講座');

      expect(result.isValid).toBe(true);
    });

    it('should accept minimum length (1 character)', () => {
      const result = validateVideoTitle('A');

      expect(result.isValid).toBe(true);
    });

    it('should accept maximum length (200 characters)', () => {
      const longTitle = 'a'.repeat(200);
      const result = validateVideoTitle(longTitle);

      expect(result.isValid).toBe(true);
    });

    it('should accept Unicode characters (Japanese)', () => {
      const result = validateVideoTitle('初心者向けJavaScript講座');

      expect(result.isValid).toBe(true);
    });

    it('should accept special characters', () => {
      const result = validateVideoTitle('動画タイトル (2024) - Part 1');

      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validateVideoTitle('  タイトル  ');

      expect(result.isValid).toBe(true);
      expect(result.trimmedTitle).toBe('タイトル');
    });
  });

  describe('Invalid Titles', () => {
    it('should reject empty title', () => {
      const result = validateVideoTitle('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('title_required');
    });

    it('should reject whitespace-only title', () => {
      const result = validateVideoTitle('   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('title_required');
    });

    it('should reject title exceeding 200 characters', () => {
      const longTitle = 'a'.repeat(201);
      const result = validateVideoTitle(longTitle);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('title_too_long');
      expect(result.message).toContain('200文字');
    });

    it('should sanitize HTML tags', () => {
      const result = validateVideoTitle('<script>alert("XSS")</script>タイトル');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedTitle).not.toContain('<script>');
      expect(result.sanitizedTitle).not.toContain('</script>');
    });

    it('should reject title with only numbers', () => {
      const result = validateVideoTitle('12345');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('title_invalid_format');
    });
  });

  describe('Security', () => {
    it('should prevent XSS attacks', () => {
      const xssTitle = '<img src=x onerror="alert(1)">タイトル';
      const result = validateVideoTitle(xssTitle);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedTitle).not.toContain('onerror');
      expect(result.sanitizedTitle).not.toContain('<img');
    });

    it('should prevent SQL injection', () => {
      const sqlTitle = "'; DROP TABLE videos; --";
      const result = validateVideoTitle(sqlTitle);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedTitle).not.toContain('DROP TABLE');
    });

    it('should remove null bytes', () => {
      const result = validateVideoTitle('タイトル\0test');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedTitle).not.toContain('\0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle emojis', () => {
      const result = validateVideoTitle('🎬 動画タイトル 🎥');

      expect(result.isValid).toBe(true);
    });

    it('should handle mixed languages', () => {
      const result = validateVideoTitle('日本語 English 한국어');

      expect(result.isValid).toBe(true);
    });

    it('should handle line breaks', () => {
      const result = validateVideoTitle('タイトル\n改行あり');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedTitle).not.toContain('\n');
    });
  });
});
