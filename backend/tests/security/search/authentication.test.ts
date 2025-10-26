import request from 'supertest';
import app from '@/app';

describe('Search Security - Authentication', () => {
  it('should allow search without authentication', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: 'プログラミング' });

    expect(response.status).toBe(200);
  });

  it('should require authentication for recommendations feed', async () => {
    const response = await request(app)
      .get('/api/recommendations/feed');

    expect(response.status).toBe(401);
  });

  it('should require authentication for search history', async () => {
    const response = await request(app)
      .post('/api/search/history')
      .send({ query: 'プログラミング' });

    expect(response.status).toBe(401);
  });
});
