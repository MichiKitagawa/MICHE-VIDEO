import request from 'supertest';
import app from '@/app';

describe('Netflix Performance - Detail Retrieval', () => {
  let userToken: string;
  let movieId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    movieId = netflixRes.body.contents[0].id;
  });

  it('should respond within 200ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get(`/api/netflix/${movieId}`)
        .set('Authorization', `Bearer ${userToken}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(200);
  });
});
