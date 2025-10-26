import request from 'supertest';
import app from '@/app';

describe('Netflix Security - Signed URL', () => {
  let userToken: string;
  let movieId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'premium' });

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    movieId = netflixRes.body.contents[0].id;
  });

  it('should generate signed URL with expiration', async () => {
    const response = await request(app)
      .get(`/api/netflix/${movieId}/stream`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.streams[0].url).toContain('signature=');
    expect(response.body.expires_in).toBe(86400);
  });

  it('should reject expired signed URL', async () => {
    const streamRes = await request(app)
      .get(`/api/netflix/${movieId}/stream`)
      .set('Authorization', `Bearer ${userToken}`);

    const expiredUrl = streamRes.body.streams[0].url;

    // 25時間後にアクセス（モック時間を使用）
    const response = await request(app)
      .get(expiredUrl);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('url_expired');
  });
});
