import request from 'supertest';
import app from '@/app';

describe('GET /api/search/trending', () => {
  it('should retrieve trending videos (24h)', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '24h', limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('24h');
    expect(response.body.trending_videos).toBeInstanceOf(Array);
    expect(response.body.trending_videos.length).toBeLessThanOrEqual(20);

    response.body.trending_videos.forEach((item: any, index: number) => {
      expect(item.rank).toBe(index + 1);
      expect(item.video).toBeDefined();
      expect(item.video.id).toBeDefined();
      expect(item.video.title).toBeDefined();
      expect(item.video.views_24h).toBeGreaterThan(0);
      expect(item.video.trending_score).toBeGreaterThan(0);
    });
  });

  it('should retrieve trending videos (7d)', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '7d' });

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('7d');
  });

  it('should retrieve trending videos (30d)', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '30d' });

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('30d');
  });

  it('should apply category filter', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '24h', category: 'gaming' });

    expect(response.status).toBe(200);
    response.body.trending_videos.forEach((item: any) => {
      expect(item.video.category).toBe('gaming');
    });
  });

  it('should sort by trending score descending', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '24h' });

    expect(response.status).toBe(200);
    const scores = response.body.trending_videos.map((item: any) => item.video.trending_score);
    const sortedScores = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sortedScores);
  });
});
