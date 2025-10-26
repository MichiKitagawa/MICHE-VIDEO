import request from 'supertest';
import app from '@/app';

describe('POST /api/netflix/:id/progress', () => {
  let userToken: string;
  let movieId: string;
  let episodeId: string;

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
      .query({ type: 'all', limit: 10 });

    movieId = netflixRes.body.contents.find((c: any) => c.type === 'movie')?.id;
    const series = netflixRes.body.contents.find((c: any) => c.type === 'series');

    if (series) {
      const seriesRes = await request(app)
        .get(`/api/netflix/${series.id}`)
        .set('Authorization', `Bearer ${userToken}`);
      episodeId = seriesRes.body.seasons[0]?.episodes[0]?.episode_id;
    }
  });

  it('should save movie watch progress', async () => {
    const response = await request(app)
      .post(`/api/netflix/${movieId}/progress`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        progress_seconds: 1800,
        duration_seconds: 8100
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('進捗を保存しました');
  });

  it('should save episode watch progress', async () => {
    if (!episodeId) return;

    const response = await request(app)
      .post(`/api/netflix/${movieId}/progress`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        episode_id: episodeId,
        progress_seconds: 1200,
        duration_seconds: 2700
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('進捗を保存しました');
  });
});
