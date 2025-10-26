import request from 'supertest';
import app from '@/app';

describe('GET /api/netflix/:id/stream', () => {
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

  it('should retrieve signed streaming URLs', async () => {
    const response = await request(app)
      .get(`/api/netflix/${movieId}/stream`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.content_id).toBe(movieId);
    expect(response.body.streams).toBeInstanceOf(Array);
    expect(response.body.streams.length).toBeGreaterThan(0);
    expect(response.body.expires_in).toBe(86400);

    response.body.streams.forEach((stream: any) => {
      expect(stream.quality).toMatch(/^(1080p|720p|480p)$/);
      expect(stream.url).toContain('signature=');
      expect(stream.bitrate).toBeGreaterThan(0);
    });
  });

  it('should require Premium plan', async () => {
    const freeUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .get(`/api/netflix/${movieId}/stream`)
      .set('Authorization', `Bearer ${freeUserRes.body.access_token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('premium_required');
  });
});
