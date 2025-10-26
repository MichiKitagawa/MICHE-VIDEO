import request from 'supertest';
import app from '@/app';

describe('POST /api/search/history', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should save search query to history', async () => {
    const response = await request(app)
      .post('/api/search/history')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        query: 'プログラミング',
        result_count: 123
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('検索履歴を保存しました');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/search/history')
      .send({ query: 'プログラミング' });

    expect(response.status).toBe(401);
  });

  it('should update popular searches count', async () => {
    await request(app)
      .post('/api/search/history')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ query: 'プログラミング', result_count: 100 });

    const popularRes = await request(app)
      .get('/api/search/popular');

    const popularItem = popularRes.body.popular_searches.find(
      (item: any) => item.query === 'プログラミング'
    );
    expect(popularItem).toBeDefined();
    expect(popularItem.search_count).toBeGreaterThan(0);
  });
});
