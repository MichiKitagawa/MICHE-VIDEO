import request from 'supertest';
import app from '@/app';

describe('Search Security - XSS Prevention', () => {
  it('should sanitize search query (XSS)', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: '<script>alert("XSS")</script>プログラミング' });

    expect(response.status).toBe(200);
    expect(response.body.query).not.toContain('<script>');
  });

  it('should sanitize search suggestions', async () => {
    const userToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' })).body.access_token;

    await request(app)
      .post('/api/search/history')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ query: '<img src=x onerror="alert(1)">プログラミング' });

    const response = await request(app)
      .get('/api/search/suggest')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ q: 'プロ' });

    expect(response.status).toBe(200);
    response.body.suggestions.forEach((suggestion: any) => {
      expect(suggestion.query).not.toContain('onerror');
      expect(suggestion.query).not.toContain('<img');
    });
  });
});
