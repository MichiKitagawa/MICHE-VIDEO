import request from 'supertest';
import app from '@/app';

describe('POST /api/creators/apply', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should create creator application successfully', async () => {
    const response = await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(201);
    expect(response.body.application).toBeDefined();
    expect(response.body.application.id).toBeDefined();
    expect(response.body.application.status).toBe('approved');
    expect(response.body.application.applied_at).toBeDefined();
    expect(response.body.message).toBe('クリエイター申請が承認されました');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/creators/apply');

    expect(response.status).toBe(401);
  });

  it('should reject duplicate application', async () => {
    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${userToken}`);

    const response = await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('creator_application_exists');
  });
});
