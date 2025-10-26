import request from 'supertest';
import app from '@/app';

describe('POST /api/netflix/:id/seasons', () => {
  let creatorToken: string;
  let seriesId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);

    const seriesRes = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'series',
        title: 'テストシリーズ',
        genres: ['ドラマ'],
        country: 'JP',
        release_year: 2024
      });

    seriesId = seriesRes.body.id;
  });

  it('should create season successfully', async () => {
    const response = await request(app)
      .post(`/api/netflix/${seriesId}/seasons`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        season_number: 1,
        title: 'シーズン1',
        description: '物語の始まり',
        release_year: 2024
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.season_number).toBe(1);
    expect(response.body.title).toBe('シーズン1');
    expect(response.body.netflix_content_id).toBe(seriesId);
  });

  it('should reject duplicate season number', async () => {
    await request(app)
      .post(`/api/netflix/${seriesId}/seasons`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ season_number: 1, title: 'シーズン1' });

    const response = await request(app)
      .post(`/api/netflix/${seriesId}/seasons`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ season_number: 1, title: 'シーズン1' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('season_already_exists');
  });
});
