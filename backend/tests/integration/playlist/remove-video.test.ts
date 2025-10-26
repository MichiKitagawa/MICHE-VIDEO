import request from 'supertest';
import app from '@/app';

describe('DELETE /api/playlists/:id/videos/:video_id', () => {
  let userToken: string;
  let playlistId: string;
  let videoId: string;

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

    const videoRes = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'テスト動画' });
    videoId = videoRes.body.video.id;

    await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: videoId });
  });

  it('should remove video from playlist successfully', async () => {
    const response = await request(app)
      .delete(`/api/playlists/${playlistId}/videos/${videoId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('プレイリストから動画を削除しました');
  });
});
