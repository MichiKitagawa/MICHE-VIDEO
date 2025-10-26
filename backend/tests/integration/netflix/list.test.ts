import request from 'supertest';
import app from '@/app';

describe('GET /api/netflix', () => {
  it('should retrieve all Netflix contents', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ type: 'all', limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.contents).toBeInstanceOf(Array);
    expect(response.body.total).toBeGreaterThanOrEqual(0);
    expect(response.body.offset).toBe(0);
    expect(response.body.limit).toBe(20);

    response.body.contents.forEach((content: any) => {
      expect(content.id).toBeDefined();
      expect(content.type).toMatch(/^(movie|series)$/);
      expect(content.title).toBeDefined();
      expect(content.poster_url).toBeDefined();
      expect(content.release_year).toBeGreaterThan(1900);
      expect(content.genres).toBeInstanceOf(Array);
      expect(content.rating).toBeGreaterThanOrEqual(0);
      expect(content.rating).toBeLessThanOrEqual(5);
    });
  });

  it('should filter by type (movie)', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie' });

    expect(response.status).toBe(200);
    response.body.contents.forEach((content: any) => {
      expect(content.type).toBe('movie');
      expect(content.duration).toBeGreaterThan(0);
    });
  });

  it('should filter by type (series)', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ type: 'series' });

    expect(response.status).toBe(200);
    response.body.contents.forEach((content: any) => {
      expect(content.type).toBe('series');
      expect(content.season_count).toBeGreaterThan(0);
    });
  });

  it('should filter by genre', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ type: 'all', genre: 'ファンタジー' });

    expect(response.status).toBe(200);
    response.body.contents.forEach((content: any) => {
      expect(content.genres).toContain('ファンタジー');
    });
  });

  it('should filter by country', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ country: 'JP' });

    expect(response.status).toBe(200);
    response.body.contents.forEach((content: any) => {
      expect(content.country).toBe('JP');
    });
  });
});
