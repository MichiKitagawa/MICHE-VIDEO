import request from 'supertest';
import app from '@/app';

describe('POST /api/playlists/create', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should create playlist successfully', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'お気に入り動画',
        description: '何度も見たい動画を集めました',
        is_public: true
      });

    expect(response.status).toBe(201);
    expect(response.body.playlist.name).toBe('お気に入り動画');
    expect(response.body.playlist.is_public).toBe(true);
  });

  it('should reject playlist without name', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ is_public: true });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('name_required');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .send({ name: 'プレイリスト' });

    expect(response.status).toBe(401);
  });
});
