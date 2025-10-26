import request from 'supertest';
import app from '@/app';

describe('Search Security - Rate Limiting', () => {
  it('should enforce rate limit for search (100 requests/min)', async () => {
    const requests = [];

    for (let i = 0; i < 101; i++) {
      requests.push(
        request(app)
          .get('/api/search')
          .query({ q: 'test' })
      );
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  it('should enforce rate limit for suggest (200 requests/min)', async () => {
    const requests = [];

    for (let i = 0; i < 201; i++) {
      requests.push(
        request(app)
          .get('/api/search/suggest')
          .query({ q: 'te' })
      );
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
