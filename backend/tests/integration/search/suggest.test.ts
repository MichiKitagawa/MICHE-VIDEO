import request from 'supertest';
import app from '@/app';

describe('GET /api/search/suggest', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should retrieve search suggestions', async () => {
    const response = await request(app)
      .get('/api/search/suggest')
      .query({ q: 'プロ', limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.suggestions).toBeInstanceOf(Array);
    expect(response.body.suggestions.length).toBeLessThanOrEqual(10);

    response.body.suggestions.forEach((suggestion: any) => {
      expect(suggestion.query).toBeDefined();
      expect(suggestion.type).toMatch(/^(popular|history)$/);
      expect(suggestion.query.toLowerCase()).toContain('プロ'.toLowerCase());
    });
  });

  it('should include user search history when authenticated', async () => {
    await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ q: 'プログラミング入門' });

    const response = await request(app)
      .get('/api/search/suggest')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ q: 'プロ' });

    expect(response.status).toBe(200);
    const historyItems = response.body.suggestions.filter((s: any) => s.type === 'history');
    expect(historyItems.length).toBeGreaterThan(0);
  });

  it('should include popular searches', async () => {
    const response = await request(app)
      .get('/api/search/suggest')
      .query({ q: 'プロ' });

    expect(response.status).toBe(200);
    const popularItems = response.body.suggestions.filter((s: any) => s.type === 'popular');
    expect(popularItems.length).toBeGreaterThan(0);
    expect(popularItems[0].search_count).toBeGreaterThan(0);
  });

  it('should reject query with less than 2 characters', async () => {
    const response = await request(app)
      .get('/api/search/suggest')
      .query({ q: 'a' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('query_too_short');
  });
});
