import { checkVideoLimit } from '@/lib/playlist/limits';

describe('Playlist Video Limit', () => {
  it('should allow up to 50 videos for Free plan', () => {
    const result = checkVideoLimit('free', 50);
    expect(result.allowed).toBe(true);
  });

  it('should reject 51st video for Free plan', () => {
    const result = checkVideoLimit('free', 51);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(50);
  });

  it('should allow up to 200 videos for Premium plan', () => {
    const result = checkVideoLimit('premium', 200);
    expect(result.allowed).toBe(true);
  });

  it('should allow up to 500 videos for Premium+ plan', () => {
    const result = checkVideoLimit('premium_plus', 500);
    expect(result.allowed).toBe(true);
  });
});
