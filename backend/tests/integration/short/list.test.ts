import request from 'supertest';
import app from '@/app';

/**
 * Short List API Integration Tests
 *
 * Tests the GET /api/shorts/my-shorts endpoint for:
 * - Pagination support
 * - Privacy filtering
 * - Sorting (view count, created date)
 * - Returned short metadata
 * - Authentication requirement
 *
 * Reference: docs/tests/short-management-tests.md
 */

describe('GET /api/shorts/my-shorts', () => {
  let accessToken: string;
  let otherUserToken: string;

  beforeEach(async () => {
    // Setup: Login as main user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;

    // Setup: Login as different user
    const otherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other-creator@example.com', password: 'TestPass123!' });
    otherUserToken = otherLogin.body.access_token;

    // Setup: Create test shorts for the main user
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: `テストショート ${i + 1}`,
          privacy: i % 2 === 0 ? 'public' : 'private',
          video_file: `mf_test_${i}`
        });
    }
  });

  describe('Successful List Retrieval', () => {
    it('should get user shorts with pagination', async () => {
      // Act: Get first page
      const response = await request(app)
        .get('/api/shorts/my-shorts?page=1&limit=20')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert: Should return paginated results
      expect(response.status).toBe(200);
      expect(response.body.shorts).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.has_more).toBeDefined();
    });

    it('should return short metadata', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?limit=1')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      if (response.body.shorts.length > 0) {
        const short = response.body.shorts[0];

        expect(short.id).toBeDefined();
        expect(short.id).toMatch(/^short_/);
        expect(short.title).toBeDefined();
        expect(short.thumbnail_url).toBeDefined();
        expect(short.duration).toBeDefined();
        expect(short.privacy).toBeDefined();
        expect(short.view_count).toBeGreaterThanOrEqual(0);
        expect(short.like_count).toBeGreaterThanOrEqual(0);
        expect(short.comment_count).toBeGreaterThanOrEqual(0);
        expect(short.created_at).toBeDefined();
        expect(short.status).toBeDefined();
      }
    });

    it('should only return current user shorts', async () => {
      // Act: Get shorts for main user
      const response = await request(app)
        .get('/api/shorts/my-shorts')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert: All shorts should belong to current user
      expect(response.status).toBe(200);
      response.body.shorts.forEach((short: any) => {
        expect(short.user_id).toBe(response.body.user_id);
      });
    });

    it('should handle empty results', async () => {
      // Arrange: Use user with no shorts
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new-creator@example.com',
          password: 'TestPass123!',
          name: 'New Creator'
        });

      // Act: Get shorts
      const response = await request(app)
        .get('/api/shorts/my-shorts')
        .set('Authorization', `Bearer ${newUserRes.body.access_token}`);

      // Assert: Should return empty array
      expect(response.status).toBe(200);
      expect(response.body.shorts).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  describe('Pagination', () => {
    it('should support page and limit parameters', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.shorts.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should paginate correctly across multiple pages', async () => {
      // Act: Get page 1 and page 2
      const page1 = await request(app)
        .get('/api/shorts/my-shorts?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`);

      const page2 = await request(app)
        .get('/api/shorts/my-shorts?page=2&limit=2')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert: Should have different shorts
      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      const ids1 = page1.body.shorts.map((s: any) => s.id);
      const ids2 = page2.body.shorts.map((s: any) => s.id);

      // No overlap between pages
      const intersection = ids1.filter((id: string) => ids2.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('should default to page 1 and limit 20', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should handle invalid page number', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?page=-1')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should either reject or default to page 1
      expect(response.status).toBeOneOf([200, 400]);
    });

    it('should enforce maximum limit of 50', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?limit=100')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBeLessThanOrEqual(50);
    });
  });

  describe('Privacy Filtering', () => {
    it('should filter by privacy setting', async () => {
      // Act: Filter by public privacy
      const response = await request(app)
        .get('/api/shorts/my-shorts?privacy=public')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert: All results should be public
      expect(response.status).toBe(200);
      response.body.shorts.forEach((short: any) => {
        expect(short.privacy).toBe('public');
      });
    });

    it('should filter by private privacy', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?privacy=private')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      response.body.shorts.forEach((short: any) => {
        expect(short.privacy).toBe('private');
      });
    });

    it('should return all privacies when no filter applied', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // Should have both public and private shorts
      const privacies = response.body.shorts.map((s: any) => s.privacy);
      const uniquePrivacies = [...new Set(privacies)];
      expect(uniquePrivacies.length).toBeGreaterThan(0);
    });

    it('should reject invalid privacy filter', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?privacy=invalid')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('privacy_invalid');
    });
  });

  describe('Sorting', () => {
    it('should sort by view count descending', async () => {
      // Act: Request sorted by views
      const response = await request(app)
        .get('/api/shorts/my-shorts?sort=view_count&order=desc')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert: Should be sorted by view count
      expect(response.status).toBe(200);
      const shorts = response.body.shorts;

      if (shorts.length > 1) {
        for (let i = 0; i < shorts.length - 1; i++) {
          expect(shorts[i].view_count).toBeGreaterThanOrEqual(shorts[i + 1].view_count);
        }
      }
    });

    it('should sort by created date descending', async () => {
      // Act: Request sorted by date
      const response = await request(app)
        .get('/api/shorts/my-shorts?sort=created_at&order=desc')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert: Should be sorted by date (newest first)
      expect(response.status).toBe(200);
      const shorts = response.body.shorts;

      if (shorts.length > 1) {
        const first = new Date(shorts[0].created_at);
        const second = new Date(shorts[1].created_at);
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
      }
    });

    it('should sort by like count descending', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?sort=like_count&order=desc')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const shorts = response.body.shorts;

      if (shorts.length > 1) {
        for (let i = 0; i < shorts.length - 1; i++) {
          expect(shorts[i].like_count).toBeGreaterThanOrEqual(shorts[i + 1].like_count);
        }
      }
    });

    it('should sort ascending when specified', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?sort=view_count&order=asc')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const shorts = response.body.shorts;

      if (shorts.length > 1) {
        for (let i = 0; i < shorts.length - 1; i++) {
          expect(shorts[i].view_count).toBeLessThanOrEqual(shorts[i + 1].view_count);
        }
      }
    });

    it('should default to created_at desc when no sort specified', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const shorts = response.body.shorts;

      if (shorts.length > 1) {
        const first = new Date(shorts[0].created_at);
        const second = new Date(shorts[1].created_at);
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
      }
    });

    it('should reject invalid sort field', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?sort=invalid_field')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('sort_field_invalid');
    });
  });

  describe('Status Filtering', () => {
    it('should filter by processing status', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?status=processing')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      response.body.shorts.forEach((short: any) => {
        expect(short.status).toBe('processing');
      });
    });

    it('should filter by published status', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?status=published')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      response.body.shorts.forEach((short: any) => {
        expect(short.status).toBe('published');
      });
    });

    it('should filter by failed status', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?status=failed')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      response.body.shorts.forEach((short: any) => {
        expect(short.status).toBe('failed');
      });
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Act: Attempt without token
      const response = await request(app)
        .get('/api/shorts/my-shorts');

      // Assert: Should reject
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    it('should return different shorts for different users', async () => {
      // Arrange: Get shorts for both users
      const user1Res = await request(app)
        .get('/api/shorts/my-shorts')
        .set('Authorization', `Bearer ${accessToken}`);

      const user2Res = await request(app)
        .get('/api/shorts/my-shorts')
        .set('Authorization', `Bearer ${otherUserToken}`);

      // Assert: Should have different shorts
      expect(user1Res.status).toBe(200);
      expect(user2Res.status).toBe(200);

      const ids1 = user1Res.body.shorts.map((s: any) => s.id);
      const ids2 = user2Res.body.shorts.map((s: any) => s.id);

      // No overlap (assuming users created different shorts)
      const intersection = ids1.filter((id: string) => ids2.includes(id));
      expect(intersection.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should respond within 300ms (P95)', async () => {
      const times: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        await request(app)
          .get('/api/shorts/my-shorts')
          .set('Authorization', `Bearer ${accessToken}`);
        times.push(Date.now() - start);
      }

      times.sort((a, b) => a - b);
      const p95 = times[Math.floor(times.length * 0.95)];
      expect(p95).toBeLessThan(300);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large page numbers', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?page=9999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.shorts).toEqual([]);
    });

    it('should handle page=0 gracefully', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?page=0')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should either reject or default to page 1
      expect(response.status).toBeOneOf([200, 400]);
    });

    it('should handle limit=0', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?limit=0')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle negative limit', async () => {
      const response = await request(app)
        .get('/api/shorts/my-shorts?limit=-10')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
    });
  });
});

// Helper matcher for status codes
expect.extend({
  toBeOneOf(received: number, expected: number[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => `expected ${received} to be one of ${expected.join(', ')}`
    };
  }
});
