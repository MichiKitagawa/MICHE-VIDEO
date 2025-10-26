import request from 'supertest';
import app from '@/app';

describe('GET /api/creators/application/status', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${userToken}`);
  });

  it('should retrieve application status', async () => {
    const response = await request(app)
      .get('/api/creators/application/status')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.application).toBeDefined();
    expect(response.body.application.status).toMatch(/^(pending|approved|rejected)$/);
    expect(response.body.application.applied_at).toBeDefined();
  });

  it('should return 404 if no application exists', async () => {
    const newUserRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'TestPass123!',
        display_name: '新規ユーザー'
      });

    const response = await request(app)
      .get('/api/creators/application/status')
      .set('Authorization', `Bearer ${newUserRes.body.access_token}`);

    expect(response.status).toBe(404);
  });
});
