import request from 'supertest';
import app from '@/app';

describe('GET /api/channels/:id', () => {
  let channelId: string;

  beforeEach(async () => {
    const creatorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorRes.body.access_token}`);

    const channelRes = await request(app)
      .get('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorRes.body.access_token}`);

    channelId = channelRes.body.id;
  });

  it('should retrieve channel details', async () => {
    const response = await request(app)
      .get(`/api/channels/${channelId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(channelId);
    expect(response.body.user_id).toBeDefined();
    expect(response.body.name).toBeDefined();
    expect(response.body.description).toBeDefined();
    expect(response.body.subscriber_count).toBeGreaterThanOrEqual(0);
    expect(response.body.total_views).toBeGreaterThanOrEqual(0);
    expect(response.body.total_videos).toBeGreaterThanOrEqual(0);
    expect(response.body.is_verified).toBeDefined();
    expect(response.body.created_at).toBeDefined();
    expect(response.body.links).toBeInstanceOf(Array);
    expect(response.body.videos).toBeInstanceOf(Array);
    expect(response.body.shorts).toBeInstanceOf(Array);
  });

  it('should return 404 for non-existent channel', async () => {
    const response = await request(app)
      .get('/api/channels/ch_nonexistent');

    expect(response.status).toBe(404);
  });
});
