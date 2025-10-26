import { validateVideoCategory } from '@/lib/video/validation';

/**
 * Video Category Validation Tests
 *
 * Tests the validation logic for video categories to ensure:
 * - Valid categories are accepted
 * - Invalid categories are rejected
 * - Category limits are enforced
 * - Special cases are handled properly
 *
 * Reference: docs/tests/video-management-tests.md
 */

describe('Video Category Validation', () => {
  describe('Valid Categories', () => {
    it('should accept "education" category', () => {
      // Arrange: Valid education category
      const category = 'education';

      // Act: Validate the category
      const result = validateVideoCategory(category);

      // Assert: Should be valid
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('education');
    });

    it('should accept "entertainment" category', () => {
      const result = validateVideoCategory('entertainment');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('entertainment');
    });

    it('should accept "gaming" category', () => {
      const result = validateVideoCategory('gaming');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('gaming');
    });

    it('should accept "music" category', () => {
      const result = validateVideoCategory('music');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('music');
    });

    it('should accept "sports" category', () => {
      const result = validateVideoCategory('sports');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('sports');
    });

    it('should accept "technology" category', () => {
      const result = validateVideoCategory('technology');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('technology');
    });

    it('should accept "cooking" category', () => {
      const result = validateVideoCategory('cooking');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('cooking');
    });

    it('should accept "travel" category', () => {
      const result = validateVideoCategory('travel');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('travel');
    });

    it('should accept "news" category', () => {
      const result = validateVideoCategory('news');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('news');
    });

    it('should accept "vlog" category', () => {
      const result = validateVideoCategory('vlog');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('vlog');
    });

    it('should accept "other" category', () => {
      const result = validateVideoCategory('other');

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('other');
    });

    it('should normalize category to lowercase', () => {
      // Arrange: Uppercase category
      const category = 'EDUCATION';

      // Act: Validate and normalize
      const result = validateVideoCategory(category);

      // Assert: Should normalize to lowercase
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('education');
    });

    it('should trim whitespace from category', () => {
      // Arrange: Category with whitespace
      const category = '  gaming  ';

      // Act: Validate and trim
      const result = validateVideoCategory(category);

      // Assert: Should trim whitespace
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('gaming');
    });
  });

  describe('Invalid Categories', () => {
    it('should reject empty category', () => {
      // Arrange: Empty category
      const category = '';

      // Act: Validate empty category
      const result = validateVideoCategory(category);

      // Assert: Should be invalid
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_required');
      expect(result.message).toContain('カテゴリを選択してください');
    });

    it('should reject whitespace-only category', () => {
      const result = validateVideoCategory('   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_required');
    });

    it('should reject invalid category name', () => {
      // Arrange: Non-existent category
      const category = 'invalid_category';

      // Act: Validate invalid category
      const result = validateVideoCategory(category);

      // Assert: Should be invalid
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
      expect(result.message).toContain('無効なカテゴリ');
    });

    it('should reject numeric category', () => {
      const result = validateVideoCategory('12345');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should reject category with special characters', () => {
      const result = validateVideoCategory('education@#$');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should reject category with spaces', () => {
      const result = validateVideoCategory('some category');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should reject undefined category', () => {
      const result = validateVideoCategory(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_required');
    });

    it('should reject null category', () => {
      const result = validateVideoCategory(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_required');
    });
  });

  describe('Category Limits', () => {
    it('should validate single category assignment', () => {
      // Arrange: Single category
      const category = 'education';

      // Act: Validate category
      const result = validateVideoCategory(category);

      // Assert: Should accept single category
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('education');
    });

    it('should enforce one category per video', () => {
      // Arrange: Multiple categories (not allowed)
      const categories = ['education', 'technology'];

      // Act: Validate multiple categories
      const result = validateVideoCategory(categories as any);

      // Assert: Should reject multiple categories
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_must_be_single');
      expect(result.message).toContain('1つのカテゴリ');
    });

    it('should validate category length', () => {
      // Arrange: Very long category name
      const longCategory = 'a'.repeat(101);

      // Act: Validate long category
      const result = validateVideoCategory(longCategory);

      // Assert: Should reject long category
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });
  });

  describe('Security', () => {
    it('should prevent XSS in category', () => {
      // Arrange: Category with script tag
      const xssCategory = '<script>alert("XSS")</script>';

      // Act: Validate XSS attempt
      const result = validateVideoCategory(xssCategory);

      // Assert: Should reject malicious input
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should prevent SQL injection in category', () => {
      // Arrange: SQL injection attempt
      const sqlCategory = "'; DROP TABLE videos; --";

      // Act: Validate SQL injection
      const result = validateVideoCategory(sqlCategory);

      // Assert: Should reject malicious input
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should reject category with HTML entities', () => {
      const result = validateVideoCategory('&lt;education&gt;');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should remove null bytes from category', () => {
      const result = validateVideoCategory('education\0test');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });
  });

  describe('Edge Cases', () => {
    it('should handle category with mixed case', () => {
      // Arrange: Mixed case category
      const category = 'EdUcAtIoN';

      // Act: Validate mixed case
      const result = validateVideoCategory(category);

      // Assert: Should normalize to lowercase
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('education');
    });

    it('should handle category with Unicode characters', () => {
      // Arrange: Category with Unicode (invalid)
      const category = '教育';

      // Act: Validate Unicode category
      const result = validateVideoCategory(category);

      // Assert: Should reject (only English categories allowed)
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should handle category with hyphens', () => {
      const result = validateVideoCategory('edu-cation');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should handle category with underscores', () => {
      const result = validateVideoCategory('edu_cation');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_invalid');
    });

    it('should validate boolean input as category', () => {
      const result = validateVideoCategory(true as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_required');
    });

    it('should validate number input as category', () => {
      const result = validateVideoCategory(123 as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_required');
    });

    it('should validate object input as category', () => {
      const result = validateVideoCategory({ name: 'education' } as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('category_must_be_single');
    });
  });

  describe('Default Category', () => {
    it('should provide default category when none specified', () => {
      // Arrange: Empty category with default option
      const result = validateVideoCategory('', { useDefault: true });

      // Assert: Should use default category "other"
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('other');
      expect(result.usedDefault).toBe(true);
    });

    it('should not use default when valid category provided', () => {
      const result = validateVideoCategory('education', { useDefault: true });

      expect(result.isValid).toBe(true);
      expect(result.category).toBe('education');
      expect(result.usedDefault).toBe(false);
    });
  });

  describe('Get All Valid Categories', () => {
    it('should return list of all valid categories', () => {
      // Arrange: Import validation utility
      const { getValidCategories } = require('@/lib/video/validation');

      // Act: Get all valid categories
      const categories = getValidCategories();

      // Assert: Should return all categories
      expect(categories).toBeInstanceOf(Array);
      expect(categories).toContain('education');
      expect(categories).toContain('entertainment');
      expect(categories).toContain('gaming');
      expect(categories).toContain('music');
      expect(categories).toContain('sports');
      expect(categories).toContain('technology');
      expect(categories).toContain('cooking');
      expect(categories).toContain('travel');
      expect(categories).toContain('news');
      expect(categories).toContain('vlog');
      expect(categories).toContain('other');
      expect(categories.length).toBe(11);
    });
  });
});
