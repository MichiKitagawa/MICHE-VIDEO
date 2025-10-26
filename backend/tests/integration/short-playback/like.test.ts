import request from 'supertest';
import app from '@/app';

describe('POST /api/shorts/:id/like', () => {
  let accessToken: string;
  let shortId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;
    shortId = 'short_test123';
  });

  it('should like short successfully', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('いいねしました');
  });

  it('should increment like count', async () => {
    const before = await request(app).get(`/api/shorts/${shortId}`);
    const initialCount = before.body.like_count;

    await request(app)
      .post(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    const after = await request(app).get(`/api/shorts/${shortId}`);
    expect(after.body.like_count).toBe(initialCount + 1);
  });

  it('should return 409 if already liked', async () => {
    await request(app)
      .post(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    const response = await request(app)
      .post(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(409);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/like`);

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/shorts/:id/like', () => {
  let accessToken: string;
  let shortId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;
    shortId = 'short_test123';
  });

  it('should unlike short successfully', async () => {
    await request(app)
      .post(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    const response = await request(app)
      .delete(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('いいねを解除しました');
  });

  it('should decrement like count', async () => {
    await request(app)
      .post(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    const before = await request(app).get(`/api/shorts/${shortId}`);
    const initialCount = before.body.like_count;

    await request(app)
      .delete(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    const after = await request(app).get(`/api/shorts/${shortId}`);
    expect(after.body.like_count).toBe(initialCount - 1);
  });

  it('should return 404 if not liked', async () => {
    const response = await request(app)
      .delete(`/api/shorts/${shortId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
