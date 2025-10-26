import { validatePlaylistName } from '@/lib/playlist/validation';

describe('Playlist Name Validation', () => {
  it('should accept valid playlist name', () => {
    const result = validatePlaylistName('お気に入り動画');
    expect(result.isValid).toBe(true);
  });

  it('should accept minimum length (1 character)', () => {
    const result = validatePlaylistName('A');
    expect(result.isValid).toBe(true);
  });

  it('should accept maximum length (100 characters)', () => {
    const longName = 'a'.repeat(100);
    const result = validatePlaylistName(longName);
    expect(result.isValid).toBe(true);
  });

  it('should reject empty name', () => {
    const result = validatePlaylistName('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('プレイリスト名は必須です');
  });

  it('should reject name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = validatePlaylistName(longName);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('100文字');
  });
});
