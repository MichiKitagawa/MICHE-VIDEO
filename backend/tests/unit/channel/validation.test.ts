import { validateChannelName } from '@/lib/channel/validation';

describe('Channel Name Validation', () => {
  it('should accept valid channel name', () => {
    const result = validateChannelName('田中太郎のチャンネル');

    expect(result.isValid).toBe(true);
  });

  it('should accept minimum length (2 characters)', () => {
    const result = validateChannelName('AB');

    expect(result.isValid).toBe(true);
  });

  it('should accept maximum length (100 characters)', () => {
    const longName = 'a'.repeat(100);
    const result = validateChannelName(longName);

    expect(result.isValid).toBe(true);
  });

  it('should accept Unicode characters (Japanese)', () => {
    const result = validateChannelName('プログラミング学習チャンネル');

    expect(result.isValid).toBe(true);
  });

  it('should allow duplicate channel names', () => {
    const result1 = validateChannelName('人気チャンネル');
    const result2 = validateChannelName('人気チャンネル');

    expect(result1.isValid).toBe(true);
    expect(result2.isValid).toBe(true);
  });
});

describe('Channel Name Validation - Error Cases', () => {
  it('should reject name with less than 2 characters', () => {
    const result = validateChannelName('A');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('チャンネル名は2文字以上必要です');
  });

  it('should reject name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = validateChannelName(longName);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('100文字');
  });

  it('should reject empty name', () => {
    const result = validateChannelName('');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('チャンネル名は必須です');
  });
});
