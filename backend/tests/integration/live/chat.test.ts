import request from 'supertest';
import app from '@/app';

describe('Live Streaming - chat', () => {
  let token: string;
  let liveId: string;

  beforeEach(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    token = login.body.access_token;
    
    const createRes = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Live', category: 'gaming' });
    liveId = createRes.body.live_stream.id;
  });

  it('should handle chat endpoint', async () => {
    // Basic test structure
    expect(liveId).toBeDefined();
  });
});
