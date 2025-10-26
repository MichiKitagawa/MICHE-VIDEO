import request from 'supertest';
import app from '@/app';

describe('Recommendations Performance - Response Time', () => {
  it('should respond within 800ms (P95)', async () => {
    const userToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' })).body.access_token;

    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/recommendations/feed')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 20 });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(800);
  });
});
