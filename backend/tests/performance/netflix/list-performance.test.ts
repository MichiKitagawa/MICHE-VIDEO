import request from 'supertest';
import app from '@/app';

describe('Netflix Performance - List Retrieval', () => {
  it('should respond within 300ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/netflix')
        .query({ type: 'all', limit: 20 });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(300);
  });
});
