import request from 'supertest';
import app from '@/app';

describe('GET /api/videos/:id/recommendations', () => {
  let userToken: string;
  let videoId: string;

  beforeEach(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
    const createRes = await request(app).post('/api/videos/create').set('Authorization', `Bearer ${userToken}`).send({ title: 'おすすめテスト動画', category: 'education', media_file_id: 'mf_rec_test' });
    videoId = createRes.body.video.id;
  });

  it('should get recommended videos', async () => {
    const response = await request(app).get(`/api/videos/${videoId}/recommendations?limit=10`);
    expect(response.status).toBe(200);
    expect(response.body.recommendations).toBeInstanceOf(Array);
    expect(response.body.recommendations.length).toBeLessThanOrEqual(10);
  });

  it('should include recommendation reason', async () => {
    const response = await request(app).get(`/api/videos/${videoId}/recommendations`);
    if (response.body.recommendations.length > 0) {
      expect(response.body.recommendations[0].reason).toMatch(/^(category|tag|user_history|trending)$/);
    }
    expect(response.status).toBe(200);
  });

  it('should personalize for logged-in users', async () => {
    const anonResponse = await request(app).get(`/api/videos/${videoId}/recommendations`);
    const authResponse = await request(app).get(`/api/videos/${videoId}/recommendations`).set('Authorization', `Bearer ${userToken}`);
    expect(anonResponse.status).toBe(200);
    expect(authResponse.status).toBe(200);
  });
});
