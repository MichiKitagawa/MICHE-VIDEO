import request from 'supertest';
import app from '@/app';

describe('DELETE /api/playlists/:id', () => {
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
      .send({ name: '削除予定プレイリスト' });
    playlistId = res.body.playlist.id;
  });

  it('should delete playlist successfully', async () => {
    const response = await request(app)
      .delete(`/api/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('プレイリストを削除しました');
  });

  it('should return 404 after deletion', async () => {
    await request(app)
      .delete(`/api/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`);

    const response = await request(app)
      .get(`/api/playlists/${playlistId}`);

    expect(response.status).toBe(404);
  });
});
