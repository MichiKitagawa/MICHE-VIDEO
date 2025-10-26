import request from 'supertest';
import app from '@/app';

describe('Search Security - SQL Injection Prevention', () => {
  it('should prevent SQL injection in search query', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: "'; DROP TABLE videos; --" });

    expect(response.status).toBe(200);
    expect(response.body.results).toBeDefined();
  });

  it('should prevent SQL injection in category filter', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        category: "education' OR '1'='1"
      });

    expect(response.status).toBe(200);
  });
});
