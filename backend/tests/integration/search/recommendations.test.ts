import request from 'supertest';
import app from '@/app';

describe('GET /api/videos/:id/recommendations', () => {
  let videoId: string;
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    const videoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'テスト動画',
        category: 'education',
        tags: ['プログラミング', 'JavaScript']
      });
    videoId = videoRes.body.video.id;
  });

  it('should retrieve related videos', async () => {
    const response = await request(app)
      .get(`/api/videos/${videoId}/recommendations`)
      .query({ limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.video_id).toBe(videoId);
    expect(response.body.recommendations).toBeInstanceOf(Array);
    expect(response.body.recommendations.length).toBeLessThanOrEqual(10);

    response.body.recommendations.forEach((video: any) => {
      expect(video.id).toBeDefined();
      expect(video.title).toBeDefined();
      expect(video.category).toBeDefined();
      expect(video.score).toBeGreaterThan(0);
      expect(video.reason).toMatch(/^(category|tags|channel)$/);
    });
  });

  it('should prioritize same category videos', async () => {
    const response = await request(app)
      .get(`/api/videos/${videoId}/recommendations`)
      .query({ limit: 10 });

    expect(response.status).toBe(200);
    const sameCategoryVideos = response.body.recommendations.filter(
      (v: any) => v.category === 'education'
    );
    expect(sameCategoryVideos.length).toBeGreaterThan(0);
  });

  it('should return 404 for non-existent video', async () => {
    const response = await request(app)
      .get('/api/videos/vid_nonexistent/recommendations');

    expect(response.status).toBe(404);
  });
});
