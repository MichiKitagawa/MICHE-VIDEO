import request from 'supertest';
import app from '@/app';

describe('POST /api/netflix/:season_id/episodes', () => {
  let creatorToken: string;
  let seasonId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    const seriesRes = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'series',
        title: 'テストシリーズ',
        genres: ['ドラマ']
      });

    const seasonRes = await request(app)
      .post(`/api/netflix/${seriesRes.body.id}/seasons`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ season_number: 1, title: 'シーズン1' });

    seasonId = seasonRes.body.id;
  });

  it('should create episode successfully', async () => {
    const response = await request(app)
      .post(`/api/netflix/${seasonId}/episodes`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        episode_number: 1,
        title: '始まりの地',
        description: '平和な村で育った少年が...',
        duration: 45,
        video_file_id: 'mf_ep001',
        thumbnail_url: 'https://cdn.example.com/temp_ep001.jpg'
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.episode_number).toBe(1);
    expect(response.body.title).toBe('始まりの地');
    expect(response.body.duration).toBe(45);
    expect(response.body.season_id).toBe(seasonId);
    expect(response.body.video_url).toBeDefined();
  });

  it('should reject duplicate episode number', async () => {
    await request(app)
      .post(`/api/netflix/${seasonId}/episodes`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        episode_number: 1,
        title: 'エピソード1',
        duration: 45,
        video_file_id: 'mf_ep001'
      });

    const response = await request(app)
      .post(`/api/netflix/${seasonId}/episodes`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        episode_number: 1,
        title: 'エピソード1',
        duration: 45,
        video_file_id: 'mf_ep002'
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('episode_already_exists');
  });
});
