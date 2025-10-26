import request from 'supertest';
import app from '@/app';

describe('PATCH /api/channels/my-channel', () => {
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

  it('should update channel information successfully', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: '田中太郎のプログラミングチャンネル',
        description: '初心者向けのプログラミング講座を配信しています',
        links: [
          { platform: 'twitter', url: 'https://twitter.com/tanaka' },
          { platform: 'instagram', url: 'https://instagram.com/tanaka' }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.channel).toBeDefined();
    expect(response.body.channel.id).toBeDefined();
    expect(response.body.channel.name).toBe('田中太郎のプログラミングチャンネル');
    expect(response.body.channel.description).toBe('初心者向けのプログラミング講座を配信しています');
    expect(response.body.channel.updated_at).toBeDefined();
  });

  it('should require creator permission', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${userRes.body.access_token}`)
      .send({ name: '新しいチャンネル名' });

    expect(response.status).toBe(403);
  });

  it('should validate channel name length', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ name: 'A' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_channel_name');
  });
});
