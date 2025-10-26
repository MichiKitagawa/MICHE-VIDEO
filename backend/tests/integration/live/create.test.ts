import request from 'supertest';
import app from '@/app';

describe('POST /api/live/create', () => {
  let creatorToken: string;
  let freeUserToken: string;

  beforeEach(async () => {
    const creatorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = creatorLogin.body.access_token;

    const freeLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'TestPass123!' });
    freeUserToken = freeLogin.body.access_token;
  });

  it('should create live stream successfully', async () => {
    const response = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: '今夜のライブ配信',
        description: 'ゲーム実況します!',
        category: 'gaming',
        privacy: 'public',
        chat_enabled: true,
        super_chat_enabled: true
      });

    expect(response.status).toBe(201);
    expect(response.body.live_stream.id).toBeDefined();
    expect(response.body.live_stream.stream_key).toMatch(/^live_sk_/);
    expect(response.body.live_stream.rtmp_url).toBeDefined();
    expect(response.body.live_stream.status).toBe('scheduled');
  });

  it('should require creator permission', async () => {
    const response = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .send({ title: 'ライブ配信', category: 'gaming' });

    expect(response.status).toBe(403);
  });

  it('should validate title length', async () => {
    const response = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ title: 'a'.repeat(201), category: 'gaming' });

    expect(response.status).toBe(400);
  });
});
