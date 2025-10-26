import request from 'supertest';
import app from '@/app';

describe('GET /api/netflix/:id', () => {
  let userToken: string;
  let movieId: string;
  let seriesId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'premium' });

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'all', limit: 10 });

    movieId = netflixRes.body.contents.find((c: any) => c.type === 'movie')?.id;
    seriesId = netflixRes.body.contents.find((c: any) => c.type === 'series')?.id;
  });

  it('should retrieve movie details', async () => {
    const response = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(movieId);
    expect(response.body.type).toBe('movie');
    expect(response.body.title).toBeDefined();
    expect(response.body.description).toBeDefined();
    expect(response.body.poster_url).toBeDefined();
    expect(response.body.backdrop_url).toBeDefined();
    expect(response.body.release_year).toBeGreaterThan(1900);
    expect(response.body.country).toBeDefined();
    expect(response.body.genres).toBeInstanceOf(Array);
    expect(response.body.duration).toBeGreaterThan(0);
    expect(response.body.video_url).toBeDefined();
    expect(response.body.ip_license).toBeDefined();
    expect(response.body.view_count).toBeGreaterThanOrEqual(0);
    expect(response.body.like_count).toBeGreaterThanOrEqual(0);
  });

  it('should retrieve series details with seasons and episodes', async () => {
    const response = await request(app)
      .get(`/api/netflix/${seriesId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(seriesId);
    expect(response.body.type).toBe('series');
    expect(response.body.seasons).toBeInstanceOf(Array);
    expect(response.body.seasons.length).toBeGreaterThan(0);

    const firstSeason = response.body.seasons[0];
    expect(firstSeason.season_number).toBeGreaterThan(0);
    expect(firstSeason.title).toBeDefined();
    expect(firstSeason.episode_count).toBeGreaterThan(0);
    expect(firstSeason.episodes).toBeInstanceOf(Array);

    const firstEpisode = firstSeason.episodes[0];
    expect(firstEpisode.episode_id).toBeDefined();
    expect(firstEpisode.episode_number).toBeGreaterThan(0);
    expect(firstEpisode.title).toBeDefined();
    expect(firstEpisode.duration).toBeGreaterThan(0);
    expect(firstEpisode.video_url).toBeDefined();
    expect(firstEpisode.thumbnail_url).toBeDefined();
  });

  it('should require Premium plan', async () => {
    const freeUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${freeUserRes.body.access_token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('premium_required');
  });

  it('should return 404 for non-existent content', async () => {
    const response = await request(app)
      .get('/api/netflix/nc_nonexistent')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(404);
  });
});
