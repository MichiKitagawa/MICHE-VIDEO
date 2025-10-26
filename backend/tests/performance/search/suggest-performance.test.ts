import request from 'supertest';
import app from '@/app';

describe('Suggest Performance - Response Time', () => {
  it('should respond within 200ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/search/suggest')
        .query({ q: 'プロ' });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(200);
  });
});
