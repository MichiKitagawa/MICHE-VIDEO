import request from 'supertest';
import app from '@/app';

describe('POST/GET /api/videos/:id/comments', () => {
  let userToken: string;
  let videoId: string;

  beforeEach(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
    const createRes = await request(app).post('/api/videos/create').set('Authorization', `Bearer ${userToken}`).send({ title: 'コメントテスト動画', media_file_id: 'mf_comment_test' });
    videoId = createRes.body.video.id;
  });

  it('should post comment successfully', async () => {
    const response = await request(app).post(`/api/videos/${videoId}/comments`).set('Authorization', `Bearer ${userToken}`).send({ content: '素晴らしい動画でした！' });
    expect(response.status).toBe(201);
    expect(response.body.comment.content).toBe('素晴らしい動画でした！');
  });

  it('should get comments with pagination', async () => {
    const response = await request(app).get(`/api/videos/${videoId}/comments?page=1&limit=20`);
    expect(response.status).toBe(200);
    expect(response.body.comments).toBeInstanceOf(Array);
  });

  it('should sanitize XSS in comments', async () => {
    const response = await request(app).post(`/api/videos/${videoId}/comments`).set('Authorization', `Bearer ${userToken}`).send({ content: '<script>alert("XSS")</script>テストコメント' });
    expect(response.status).toBe(201);
    expect(response.body.comment.content).not.toContain('<script>');
  });
});
