import { validateSearchQuery } from '@/lib/search/validation';

describe('Search Query Validation', () => {
  it('should accept valid search query', () => {
    const result = validateSearchQuery('プログラミング');

    expect(result.isValid).toBe(true);
    expect(result.query).toBe('プログラミング');
  });

  it('should accept minimum length (2 characters)', () => {
    const result = validateSearchQuery('AB');

    expect(result.isValid).toBe(true);
  });

  it('should accept maximum length (200 characters)', () => {
    const longQuery = 'a'.repeat(200);
    const result = validateSearchQuery(longQuery);

    expect(result.isValid).toBe(true);
  });

  it('should accept Unicode characters (Japanese)', () => {
    const result = validateSearchQuery('初心者向けプログラミング講座');

    expect(result.isValid).toBe(true);
  });

  it('should trim whitespace', () => {
    const result = validateSearchQuery('  プログラミング  ');

    expect(result.query).toBe('プログラミング');
  });
});

describe('Search Query Validation - Error Cases', () => {
  it('should reject query with less than 2 characters', () => {
    const result = validateSearchQuery('a');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('検索クエリは2文字以上必要です');
  });

  it('should reject query exceeding 200 characters', () => {
    const longQuery = 'a'.repeat(201);
    const result = validateSearchQuery(longQuery);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('200文字');
  });

  it('should reject empty query', () => {
    const result = validateSearchQuery('');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('検索クエリは必須です');
  });

  it('should reject whitespace-only query', () => {
    const result = validateSearchQuery('   ');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('検索クエリは必須です');
  });
});
