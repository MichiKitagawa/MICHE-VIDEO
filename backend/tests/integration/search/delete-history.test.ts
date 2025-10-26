import request from 'supertest';
import app from '@/app';

describe('DELETE /api/search/history', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/search/history')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ query: 'プログラミング', result_count: 100 });
  });

  it('should delete all search history', async () => {
    const response = await request(app)
      .delete('/api/search/history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('検索履歴を削除しました');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete('/api/search/history');

    expect(response.status).toBe(401);
  });

  it('should verify history is deleted', async () => {
    await request(app)
      .delete('/api/search/history')
      .set('Authorization', `Bearer ${userToken}`);

    const historyRes = await request(app)
      .get('/api/search/history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(historyRes.body.history).toHaveLength(0);
  });
});
