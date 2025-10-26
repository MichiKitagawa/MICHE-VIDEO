import request from 'supertest';
import app from '@/app';

describe('Channel Security - Image Upload', () => {
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

  it('should reject avatar image exceeding 5MB', async () => {
    const largeImage = 'data:image/jpeg;base64,' + 'A'.repeat(6 * 1024 * 1024);

    const response = await request(app)
      .patch('/api/channels/my-channel/avatar')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ avatar: largeImage });

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('file_too_large');
  });

  it('should reject banner image exceeding 10MB', async () => {
    const largeImage = 'data:image/jpeg;base64,' + 'A'.repeat(11 * 1024 * 1024);

    const response = await request(app)
      .patch('/api/channels/my-channel/banner')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ banner: largeImage });

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('file_too_large');
  });

  it('should reject non-image files', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel/avatar')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ avatar: 'data:text/plain;base64,dGVzdA==' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_file_type');
  });
});
