import request from 'supertest';
import app from '@/app';

describe('Search Performance - Response Time', () => {
  it('should respond within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/search')
        .query({ q: 'プログラミング', type: 'video' });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });
});
