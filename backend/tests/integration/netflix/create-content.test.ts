import request from 'supertest';
import app from '@/app';

describe('POST /api/netflix/content', () => {
  let creatorToken: string;
  let ipLicenseId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ plan: 'premium' });

    const ipRes = await request(app)
      .get('/api/ip-licenses')
      .set('Authorization', `Bearer ${creatorToken}`);

    ipLicenseId = ipRes.body.find((ip: any) => ip.license_type === '商用利用可')?.id;
  });

  it('should create movie successfully', async () => {
    const response = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'movie',
        title: 'サイバーパンク：ネオン都市',
        description: '近未来のメガシティを舞台に...',
        genres: ['SF', 'アクション', 'スリラー'],
        country: 'JP',
        release_year: 2024,
        rating: 4.5,
        duration: 135,
        is_adult: false,
        privacy: 'public',
        ip_license_id: ipLicenseId,
        poster_url: 'https://cdn.example.com/posters/temp_xxx.jpg',
        backdrop_url: 'https://cdn.example.com/backdrops/temp_xxx.jpg',
        video_file_id: 'mf_xxx'
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.title).toBe('サイバーパンク：ネオン都市');
    expect(response.body.type).toBe('movie');
    expect(response.body.status).toBe('processing');
    expect(response.body.created_at).toBeDefined();
  });

  it('should require creator permission', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${userRes.body.access_token}`)
      .send({
        type: 'movie',
        title: 'テスト映画'
      });

    expect(response.status).toBe(403);
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'movie'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
  });
});
