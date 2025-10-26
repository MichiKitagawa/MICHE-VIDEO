import request from 'supertest';
import app from '@/app';

describe('POST /api/videos/:id/progress', () => {
  let userToken: string;
  let videoId: string;

  beforeEach(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
    const createRes = await request(app).post('/api/videos/create').set('Authorization', `Bearer ${userToken}`).send({ title: '進捗テスト動画', media_file_id: 'mf_progress_test' });
    videoId = createRes.body.video.id;
  });

  it('should save watch progress successfully', async () => {
    const response = await request(app).post(`/api/videos/${videoId}/progress`).set('Authorization', `Bearer ${userToken}`).send({ progress_seconds: 120, duration_seconds: 600 });
    expect(response.status).toBe(200);
    expect(response.body.progress_seconds).toBe(120);
    expect(response.body.progress_percentage).toBe(20);
  });

  it('should mark as completed when progress >= 90%', async () => {
    const response = await request(app).post(`/api/videos/${videoId}/progress`).set('Authorization', `Bearer ${userToken}`).send({ progress_seconds: 540, duration_seconds: 600 });
    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(true);
  });

  it('should require authentication', async () => {
    const response = await request(app).post(`/api/videos/${videoId}/progress`).send({ progress_seconds: 120 });
    expect(response.status).toBe(401);
  });
});
