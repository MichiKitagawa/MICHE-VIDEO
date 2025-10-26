import request from 'supertest';
import app from '@/app';

describe('POST /api/playlists/:id/videos/reorder', () => {
  let userToken: string;
  let playlistId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    const playlistRes = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'テストプレイリスト' });
    playlistId = playlistRes.body.playlist.id;
  });

  it('should reorder videos successfully', async () => {
    const response = await request(app)
      .post(`/api/playlists/${playlistId}/videos/reorder`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        video_orders: [
          { video_id: 'vid_123', position: 0 },
          { video_id: 'vid_456', position: 1 }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('動画の並び順を更新しました');
  });
});
