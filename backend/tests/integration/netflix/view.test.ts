import request from 'supertest';
import app from '@/app';

describe('POST /api/netflix/:id/view', () => {
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

  it('should record view successfully', async () => {
    const response = await request(app)
      .post(`/api/netflix/${movieId}/view`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('視聴を記録しました');
  });

  it('should increment view count', async () => {
    const beforeRes = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${userToken}`);

    const beforeViewCount = beforeRes.body.view_count;

    await request(app)
      .post(`/api/netflix/${movieId}/view`)
      .set('Authorization', `Bearer ${userToken}`);

    const afterRes = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(afterRes.body.view_count).toBe(beforeViewCount + 1);
  });
});
