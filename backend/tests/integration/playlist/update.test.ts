import request from 'supertest';
import app from '@/app';

describe('PATCH /api/playlists/:id', () => {
  let userToken: string;
  let playlistId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    const res = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: '元のプレイリスト名' });
    playlistId = res.body.playlist.id;
  });

  it('should update playlist successfully', async () => {
    const response = await request(app)
      .patch(`/api/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: '更新されたプレイリスト名' });

    expect(response.status).toBe(200);
    expect(response.body.playlist.name).toBe('更新されたプレイリスト名');
  });
});
