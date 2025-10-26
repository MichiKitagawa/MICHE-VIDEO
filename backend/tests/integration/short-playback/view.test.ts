import request from 'supertest';
import app from '@/app';

describe('POST /api/shorts/:id/view', () => {
  let accessToken: string;
  let shortId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;
    shortId = 'short_test123';
  });

  it('should record view successfully', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/view`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        watch_time_seconds: 25,
        completed: true
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('視聴を記録しました');
  });

  it('should increment view count', async () => {
    const before = await request(app).get(`/api/shorts/${shortId}`);
    const initialCount = before.body.view_count;

    await request(app)
      .post(`/api/shorts/${shortId}/view`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ watch_time_seconds: 25, completed: true });

    const after = await request(app).get(`/api/shorts/${shortId}`);
    expect(after.body.view_count).toBe(initialCount + 1);
  });

  it('should handle anonymous views', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/view`)
      .send({
        session_id: 'sess_anonymous',
        watch_time_seconds: 20,
        completed: false
      });

    expect(response.status).toBe(200);
  });

  it('should validate watch_time_seconds', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/view`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ watch_time_seconds: -5 });

    expect(response.status).toBe(400);
  });
});
