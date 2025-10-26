import { normalizeTags, validateTags } from '@/lib/shorts/tags';

/**
 * Short Tags Validation Unit Tests
 *
 * Tests the tag validation and normalization logic:
 * - Maximum 10 tags enforcement
 * - Tag format validation
 * - Duplicate tag removal
 * - XSS prevention in tags
 * - Tag length validation (max 50 chars per tag)
 *
 * Reference: docs/tests/short-management-tests.md
 */

describe('Tag Normalization', () => {
  describe('Case Normalization', () => {
    it('should convert tags to lowercase', () => {
      // Arrange: Mixed case tags
      const tags = ['Dance', 'MUSIC', 'TikTok'];

      // Act: Normalize tags
      const normalized = normalizeTags(tags);

      // Assert: Should be lowercase
      expect(normalized).toEqual(['dance', 'music', 'tiktok']);
    });

    it('should normalize Japanese tags consistently', () => {
      const tags = ['ダンス', 'ダンス', 'だんす'];

      const normalized = normalizeTags(tags);

      // Japanese doesn't have case, but should remove duplicates
      expect(normalized).toContain('ダンス');
      expect(normalized.length).toBeLessThanOrEqual(2);
    });

    it('should preserve emoji in tags', () => {
      const tags = ['dance🎵', 'music🎶'];

      const normalized = normalizeTags(tags);

      expect(normalized).toContain('dance🎵');
      expect(normalized).toContain('music🎶');
    });
  });

  describe('Duplicate Removal', () => {
    it('should remove duplicate tags', () => {
      // Arrange: Tags with duplicates
      const tags = ['dance', 'Dance', 'DANCE'];

      // Act: Normalize
      const normalized = normalizeTags(tags);

      // Assert: Should have only one instance
      expect(normalized).toEqual(['dance']);
      expect(normalized.length).toBe(1);
    });

    it('should remove case-insensitive duplicates', () => {
      const tags = ['music', 'MUSIC', 'Music', 'mUsIc'];

      const normalized = normalizeTags(tags);

      expect(normalized).toEqual(['music']);
    });

    it('should preserve unique tags', () => {
      const tags = ['dance', 'music', 'comedy'];

      const normalized = normalizeTags(tags);

      expect(normalized).toEqual(['dance', 'music', 'comedy']);
      expect(normalized.length).toBe(3);
    });

    it('should handle identical Japanese tags', () => {
      const tags = ['ダンス', 'ダンス', '音楽'];

      const normalized = normalizeTags(tags);

      expect(normalized).toContain('ダンス');
      expect(normalized).toContain('音楽');
      expect(normalized.length).toBe(2);
    });
  });

  describe('Whitespace Handling', () => {
    it('should trim whitespace from tags', () => {
      // Arrange: Tags with extra whitespace
      const tags = ['  dance  ', 'music ', ' tiktok'];

      // Act: Normalize
      const normalized = normalizeTags(tags);

      // Assert: Should trim whitespace
      expect(normalized).toEqual(['dance', 'music', 'tiktok']);
    });

    it('should remove tags with only whitespace', () => {
      const tags = ['dance', '  ', 'music', '   '];

      const normalized = normalizeTags(tags);

      expect(normalized).toEqual(['dance', 'music']);
    });

    it('should handle tabs and newlines', () => {
      const tags = ['\tdance\t', '\nmusic\n', ' comedy '];

      const normalized = normalizeTags(tags);

      expect(normalized).toEqual(['dance', 'music', 'comedy']);
    });
  });

  describe('Empty Tag Filtering', () => {
    it('should reject empty tags', () => {
      // Arrange: Mix of valid and empty tags
      const tags = ['dance', '', '  ', 'music'];

      // Act: Normalize
      const normalized = normalizeTags(tags);

      // Assert: Should filter out empty tags
      expect(normalized).toEqual(['dance', 'music']);
    });

    it('should handle array with all empty tags', () => {
      const tags = ['', '  ', '   '];

      const normalized = normalizeTags(tags);

      expect(normalized).toEqual([]);
    });

    it('should filter null and undefined values', () => {
      const tags = ['dance', null, 'music', undefined, 'comedy'] as any[];

      const normalized = normalizeTags(tags);

      expect(normalized).toEqual(['dance', 'music', 'comedy']);
    });
  });

  describe('Tag Count Limits', () => {
    it('should limit to 10 tags', () => {
      // Arrange: 15 tags (exceeds limit)
      const tags = Array(15).fill('tag').map((t, i) => `${t}${i}`);

      // Act: Normalize
      const normalized = normalizeTags(tags);

      // Assert: Should limit to 10
      expect(normalized.length).toBe(10);
    });

    it('should keep first 10 tags when limit exceeded', () => {
      const tags = ['tag0', 'tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10', 'tag11'];

      const normalized = normalizeTags(tags);

      expect(normalized.length).toBe(10);
      expect(normalized).toContain('tag0');
      expect(normalized).toContain('tag9');
      expect(normalized).not.toContain('tag10');
      expect(normalized).not.toContain('tag11');
    });

    it('should accept exactly 10 tags', () => {
      const tags = Array(10).fill('tag').map((t, i) => `${t}${i}`);

      const normalized = normalizeTags(tags);

      expect(normalized.length).toBe(10);
    });

    it('should handle fewer than 10 tags', () => {
      const tags = ['tag1', 'tag2', 'tag3'];

      const normalized = normalizeTags(tags);

      expect(normalized.length).toBe(3);
    });
  });

  describe('Tag Length Validation', () => {
    it('should reject tags exceeding 50 characters', () => {
      // Arrange: Tag that's too long
      const longTag = 'a'.repeat(51);
      const tags = ['dance', longTag];

      // Act: Normalize
      const normalized = normalizeTags(tags);

      // Assert: Should exclude long tag
      expect(normalized).not.toContain(longTag);
      expect(normalized).toContain('dance');
    });

    it('should accept tag at exactly 50 characters', () => {
      const maxTag = 'a'.repeat(50);
      const tags = ['dance', maxTag];

      const normalized = normalizeTags(tags);

      expect(normalized).toContain(maxTag);
      expect(normalized.length).toBe(2);
    });

    it('should filter multiple long tags', () => {
      const longTag1 = 'b'.repeat(51);
      const longTag2 = 'c'.repeat(60);
      const tags = ['valid', longTag1, 'also-valid', longTag2];

      const normalized = normalizeTags(tags);

      expect(normalized).toEqual(['valid', 'also-valid']);
    });

    it('should handle Japanese character tag length', () => {
      // 50 Japanese characters
      const japaneseTag = 'あ'.repeat(50);
      const tags = [japaneseTag, 'dance'];

      const normalized = normalizeTags(tags);

      expect(normalized).toContain(japaneseTag);
    });
  });
});

describe('Tag Validation', () => {
  describe('Valid Tag Arrays', () => {
    it('should accept valid tag array', () => {
      // Arrange: Valid tags
      const tags = ['dance', 'music', 'tiktok'];

      // Act: Validate
      const result = validateTags(tags);

      // Assert: Should be valid
      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).toEqual(['dance', 'music', 'tiktok']);
    });

    it('should accept empty tag array', () => {
      const tags: string[] = [];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).toEqual([]);
    });

    it('should validate and normalize simultaneously', () => {
      const tags = ['Dance', 'MUSIC', 'dance'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).toEqual(['dance', 'music']);
    });
  });

  describe('Invalid Tag Arrays', () => {
    it('should reject more than 10 tags', () => {
      // Arrange: 12 tags
      const tags = Array(12).fill('tag').map((t, i) => `${t}${i}`);

      // Act: Validate
      const result = validateTags(tags);

      // Assert: Should reject but provide normalized (truncated) version
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('too_many_tags');
      expect(result.message).toContain('10個');
      expect(result.normalizedTags?.length).toBe(10);
    });

    it('should reject non-array input', () => {
      const tags = 'not-an-array' as any;

      const result = validateTags(tags);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('tags_invalid_format');
    });

    it('should reject null input', () => {
      const tags = null as any;

      const result = validateTags(tags);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('tags_invalid_format');
    });

    it('should reject tags with invalid characters', () => {
      const tags = ['dance', 'music<script>', 'comedy'];

      const result = validateTags(tags);

      // Should sanitize or reject
      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).not.toContain('music<script>');
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize script tags in tags', () => {
      // Arrange: XSS attempt in tag
      const tags = ['<script>alert("XSS")</script>', 'validtag'];

      // Act: Validate
      const result = validateTags(tags);

      // Assert: Should sanitize
      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).not.toContain('<script>');
      expect(result.normalizedTags).toContain('validtag');
      // Sanitized version should not have script
      if (result.normalizedTags) {
        result.normalizedTags.forEach(tag => {
          expect(tag).not.toContain('<script>');
          expect(tag).not.toContain('</script>');
        });
      }
    });

    it('should prevent HTML injection in tags', () => {
      const tags = ['<img src=x onerror="alert(1)">', 'safe-tag'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      if (result.normalizedTags) {
        result.normalizedTags.forEach(tag => {
          expect(tag).not.toContain('onerror');
          expect(tag).not.toContain('<img');
        });
      }
    });

    it('should prevent event handler injection', () => {
      const tags = ['onclick="malicious()"', 'onload="bad()"', 'normal'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      if (result.normalizedTags) {
        result.normalizedTags.forEach(tag => {
          expect(tag).not.toContain('onclick');
          expect(tag).not.toContain('onload');
        });
      }
    });

    it('should sanitize SQL injection attempts', () => {
      const tags = ["'; DROP TABLE shorts; --", 'normal-tag'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      if (result.normalizedTags) {
        result.normalizedTags.forEach(tag => {
          expect(tag).not.toContain('DROP TABLE');
        });
      }
    });

    it('should remove null bytes from tags', () => {
      const tags = ['tag\0with\0nulls', 'clean'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      if (result.normalizedTags) {
        result.normalizedTags.forEach(tag => {
          expect(tag).not.toContain('\0');
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle all special characters', () => {
      const tags = ['#hashtag', '@mention', 'tag-with-dash', 'tag_underscore'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      // Special characters might be filtered based on implementation
      expect(result.normalizedTags).toBeDefined();
    });

    it('should handle Unicode tags', () => {
      const tags = ['日本語タグ', '한국어태그', 'émoji🎵'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      expect(result.normalizedTags?.length).toBeGreaterThan(0);
    });

    it('should handle mixed language tags', () => {
      const tags = ['dance踊り', 'music音楽', 'comedy笑'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).toEqual(['dance踊り', 'music音楽', 'comedy笑']);
    });

    it('should handle tags with numbers', () => {
      const tags = ['2024', 'web3', 'tag123'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).toEqual(['2024', 'web3', 'tag123']);
    });

    it('should handle single character tags', () => {
      const tags = ['a', 'b', 'c'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Platform-Specific Tag Formats', () => {
    it('should accept hashtag format (TikTok style)', () => {
      const tags = ['#dance', '#music', '#fyp'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      // Hashtags might be normalized by removing #
    });

    it('should handle camelCase tags (Instagram style)', () => {
      const tags = ['danceChallenge', 'musicVideo', 'funnyMoments'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
      expect(result.normalizedTags).toContain('dancechallenge');
    });

    it('should handle underscore-separated tags', () => {
      const tags = ['dance_challenge', 'music_video', 'tik_tok'];

      const result = validateTags(tags);

      expect(result.isValid).toBe(true);
    });
  });
});
