import request from 'supertest';
import app from '@/app';

describe('POST/DELETE /api/videos/:id/like', () => {
  let userToken: string;
  let videoId: string;

  beforeEach(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
    const createRes = await request(app).post('/api/videos/create').set('Authorization', `Bearer ${userToken}`).send({ title: 'いいねテスト動画', media_file_id: 'mf_like_test' });
    videoId = createRes.body.video.id;
  });

  it('should like video successfully', async () => {
    const response = await request(app).post(`/api/videos/${videoId}/like`).set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(200);
    expect(response.body.is_liked).toBe(true);
    expect(response.body.like_count).toBeGreaterThan(0);
  });

  it('should return 409 if already liked', async () => {
    await request(app).post(`/api/videos/${videoId}/like`).set('Authorization', `Bearer ${userToken}`);
    const response = await request(app).post(`/api/videos/${videoId}/like`).set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(409);
  });

  it('should unlike video successfully', async () => {
    await request(app).post(`/api/videos/${videoId}/like`).set('Authorization', `Bearer ${userToken}`);
    const response = await request(app).delete(`/api/videos/${videoId}/like`).set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(200);
    expect(response.body.is_liked).toBe(false);
  });
});
