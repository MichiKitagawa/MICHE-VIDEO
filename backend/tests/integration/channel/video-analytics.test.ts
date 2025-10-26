import request from 'supertest';
import app from '@/app';

describe('GET /api/analytics/videos/:video_id', () => {
  let creatorToken: string;
  let videoId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);

    const videoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ title: 'テスト動画', category: 'education' });

    videoId = videoRes.body.video.id;
  });

  it('should retrieve video analytics', async () => {
    const response = await request(app)
      .get(`/api/analytics/videos/${videoId}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.content_id).toBe(videoId);
    expect(response.body.content_type).toBe('video');
    expect(response.body.title).toBeDefined();
    expect(response.body.published_at).toBeDefined();
    expect(response.body.views).toBeGreaterThanOrEqual(0);
    expect(response.body.watch_time_hours).toBeGreaterThanOrEqual(0);
    expect(response.body.avg_view_duration).toBeGreaterThanOrEqual(0);
    expect(response.body.ctr).toBeGreaterThanOrEqual(0);
    expect(response.body.likes).toBeGreaterThanOrEqual(0);
    expect(response.body.comments).toBeGreaterThanOrEqual(0);
    expect(response.body.shares).toBeGreaterThanOrEqual(0);
    expect(response.body.views_timeline).toBeInstanceOf(Array);
    expect(response.body.traffic_sources).toBeDefined();
  });

  it('should require ownership', async () => {
    const otherUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${otherUserRes.body.access_token}`);

    const response = await request(app)
      .get(`/api/analytics/videos/${videoId}`)
      .set('Authorization', `Bearer ${otherUserRes.body.access_token}`);

    expect(response.status).toBe(403);
  });
});
