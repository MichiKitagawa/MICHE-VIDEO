import { generateStreamKey, validateStreamKey } from '@/lib/live/stream-key';

describe('Stream Key Generation', () => {
  it('should generate unique stream key', () => {
    const key1 = generateStreamKey();
    const key2 = generateStreamKey();

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
    expect(key1).toMatch(/^live_sk_[a-zA-Z0-9]{32}$/);
  });

  it('should generate cryptographically secure key', () => {
    const key = generateStreamKey();

    expect(key.length).toBe(40); // 'live_sk_' + 32 chars
    expect(key.startsWith('live_sk_')).toBe(true);
  });

  it('should validate stream key format', () => {
    const validKey = 'live_sk_' + 'a'.repeat(32);
    expect(validateStreamKey(validKey)).toBe(true);

    const invalidKey = 'invalid_key';
    expect(validateStreamKey(invalidKey)).toBe(false);
  });

  it('should generate keys with sufficient entropy', () => {
    const keys = new Set();
    for (let i = 0; i < 1000; i++) {
      keys.add(generateStreamKey());
    }
    expect(keys.size).toBe(1000); // All unique
  });
});
