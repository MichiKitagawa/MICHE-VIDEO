import request from 'supertest';
import app from '@/app';

describe('GET /api/search', () => {
  it('should search videos successfully', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        limit: 20
      });

    expect(response.status).toBe(200);
    expect(response.body.query).toBe('プログラミング');
    expect(response.body.results.videos).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);

    response.body.results.videos.forEach((video: any) => {
      expect(video.id).toBeDefined();
      expect(video.title).toBeDefined();
      expect(video.thumbnail_url).toBeDefined();
      expect(video.user_name).toBeDefined();
      expect(video.category).toBeDefined();
      expect(video.duration).toBeGreaterThan(0);
      expect(video.view_count).toBeGreaterThanOrEqual(0);
      expect(video.relevance_score).toBeGreaterThan(0);
    });
  });

  it('should search all content types', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'all',
        limit: 20
      });

    expect(response.status).toBe(200);
    expect(response.body.results.videos).toBeInstanceOf(Array);
    expect(response.body.results.shorts).toBeInstanceOf(Array);
    expect(response.body.results.channels).toBeInstanceOf(Array);
  });

  it('should apply category filter', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        category: 'education'
      });

    expect(response.status).toBe(200);
    response.body.results.videos.forEach((video: any) => {
      expect(video.category).toBe('education');
    });
  });

  it('should apply upload date filter', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        upload_date: 'week'
      });

    expect(response.status).toBe(200);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    response.body.results.videos.forEach((video: any) => {
      expect(new Date(video.created_at)).toBeInstanceOf(Date);
      expect(new Date(video.created_at).getTime()).toBeGreaterThan(oneWeekAgo.getTime());
    });
  });

  it('should apply duration filter', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        duration: 'medium'
      });

    expect(response.status).toBe(200);
    response.body.results.videos.forEach((video: any) => {
      expect(video.duration).toBeGreaterThanOrEqual(240);
      expect(video.duration).toBeLessThanOrEqual(1200);
    });
  });

  it('should sort by view count', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        sort: 'view_count'
      });

    expect(response.status).toBe(200);
    const viewCounts = response.body.results.videos.map((v: any) => v.view_count);
    const sortedViewCounts = [...viewCounts].sort((a, b) => b - a);
    expect(viewCounts).toEqual(sortedViewCounts);
  });

  it('should reject query with less than 2 characters', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: 'a' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('query_too_short');
  });

  it('should return empty results for no matches', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: 'xyzabc123nonexistent' });

    expect(response.status).toBe(200);
    expect(response.body.results.videos).toHaveLength(0);
    expect(response.body.message).toBe('検索結果が見つかりませんでした');
  });
});
