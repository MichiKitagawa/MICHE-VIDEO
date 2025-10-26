import request from 'supertest';
import app from '@/app';

describe('Channel Security - XSS Prevention', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);
  });

  it('should sanitize channel name (XSS)', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: '<script>alert("XSS")</script>田中チャンネル'
      });

    expect(response.status).toBe(200);
    expect(response.body.channel.name).not.toContain('<script>');
  });

  it('should sanitize channel description', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        description: '<img src=x onerror="alert(1)">説明'
      });

    expect(response.status).toBe(200);
    expect(response.body.channel.description).not.toContain('onerror');
  });
});
