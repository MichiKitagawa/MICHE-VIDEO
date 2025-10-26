# ショート動画再生機能テスト仕様書

**参照元**: `docs/specs/features/07-short-playback.md`

---

## 1. 概要

### 1.1 テストの目的
TikTok/Instagram Reels風のショート動画フィード、再生、エンゲージメント（いいね、コメント）機能の品質保証とパフォーマンス検証を実施する。

### 1.2 テスト範囲
- ショートフィード取得（無限スクロール）
- ショート動画再生・視聴記録
- いいね・いいね解除
- コメント投稿・取得
- コメント返信機能
- フィードアルゴリズム（パーソナライズド）
- セキュリティ対策（認証、XSS、レート制限）
- パフォーマンス基準（フィード読み込み、再生開始時間）

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+
- Jest 29+、Supertest、Playwright
- Redis（フィードキャッシュ）

### 1.4 依存関係
- データベース: `shorts`, `short_views`, `short_likes`, `short_comments`
- 外部サービス: AWS CloudFront（CDN）、Redis（キャッシュ）

---

## 2. ユニットテスト

### 2.1 フィードアルゴリズムテスト

#### TC-001: ショートフィードスコア計算

```typescript
import { calculateFeedScore } from '@/lib/shorts/feed-algorithm';

describe('Short Feed Algorithm', () => {
  it('should prioritize recent and popular shorts', () => {
    const short = {
      created_at: new Date(Date.now() - 3600000), // 1時間前
      view_count: 10000,
      like_count: 800,
      comment_count: 50,
      is_followed: false
    };

    const score = calculateFeedScore(short);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('should boost shorts from followed creators', () => {
    const shortFromFollowed = {
      created_at: new Date(),
      view_count: 100,
      like_count: 10,
      comment_count: 1,
      is_followed: true
    };

    const shortFromStranger = {
      ...shortFromFollowed,
      is_followed: false
    };

    const scoreFollowed = calculateFeedScore(shortFromFollowed);
    const scoreStranger = calculateFeedScore(shortFromStranger);

    expect(scoreFollowed).toBeGreaterThan(scoreStranger);
  });

  it('should penalize old shorts', () => {
    const recentShort = {
      created_at: new Date(),
      view_count: 1000,
      like_count: 50,
      comment_count: 5,
      is_followed: false
    };

    const oldShort = {
      ...recentShort,
      created_at: new Date(Date.now() - 30 * 24 * 3600000) // 30日前
    };

    const scoreRecent = calculateFeedScore(recentShort);
    const scoreOld = calculateFeedScore(oldShort);

    expect(scoreRecent).toBeGreaterThan(scoreOld);
  });

  it('should calculate engagement rate correctly', () => {
    const shortHighEngagement = {
      created_at: new Date(),
      view_count: 1000,
      like_count: 300, // 30% engagement
      comment_count: 50,
      is_followed: false
    };

    const shortLowEngagement = {
      created_at: new Date(),
      view_count: 1000,
      like_count: 50, // 5% engagement
      comment_count: 5,
      is_followed: false
    };

    const scoreHigh = calculateFeedScore(shortHighEngagement);
    const scoreLow = calculateFeedScore(shortLowEngagement);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });
});
```

---

### 2.2 視聴完了判定テスト

#### TC-002: 視聴完了条件チェック

```typescript
import { isViewCompleted } from '@/lib/shorts/view-tracker';

describe('View Completion Check', () => {
  it('should mark view as completed when watched 80% or more', () => {
    const duration = 30; // 30秒
    const watchedSeconds = 25; // 25秒視聴（83%）

    const result = isViewCompleted(watchedSeconds, duration);

    expect(result).toBe(true);
  });

  it('should not mark view as completed when watched less than 80%', () => {
    const duration = 30;
    const watchedSeconds = 20; // 20秒視聴（67%）

    const result = isViewCompleted(watchedSeconds, duration);

    expect(result).toBe(false);
  });

  it('should handle minimum watch time of 3 seconds', () => {
    const duration = 10;
    const watchedSeconds = 2; // 2秒視聴

    const result = isViewCompleted(watchedSeconds, duration);

    expect(result).toBe(false);
  });

  it('should count as completed if watched > duration (replay)', () => {
    const duration = 30;
    const watchedSeconds = 35; // リプレイ含む

    const result = isViewCompleted(watchedSeconds, duration);

    expect(result).toBe(true);
  });
});
```

---

## 3. 統合テスト

### 3.1 ショートフィード取得API

#### TC-101: GET /api/shorts/feed（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('GET /api/shorts/feed', () => {
  it('should get personalized short feed', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?page=1&limit=20')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.shorts).toBeInstanceOf(Array);
    expect(response.body.shorts.length).toBeLessThanOrEqual(20);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);
    expect(response.body.pagination.has_more).toBeDefined();
  });

  it('should return short with complete metadata', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?limit=1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const short = response.body.shorts[0];

    expect(short.id).toBeDefined();
    expect(short.title).toBeDefined();
    expect(short.video_url).toMatch(/\.m3u8$/); // HLS URL
    expect(short.thumbnail_url).toBeDefined();
    expect(short.duration).toBeLessThanOrEqual(60);
    expect(short.user_name).toBeDefined();
    expect(short.user_avatar).toBeDefined();
    expect(short.view_count).toBeGreaterThanOrEqual(0);
    expect(short.like_count).toBeGreaterThanOrEqual(0);
    expect(short.comment_count).toBeGreaterThanOrEqual(0);
    expect(short.is_liked).toBe(false);
  });

  it('should filter adult content for non-Premium+ users', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?limit=50')
      .set('Authorization', `Bearer ${freeUserToken}`);

    expect(response.status).toBe(200);
    response.body.shorts.forEach((short: any) => {
      expect(short.is_adult).toBe(false);
    });
  });

  it('should include is_liked status for authenticated user', async () => {
    // Like a short first
    await request(app)
      .post('/api/shorts/short_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    const response = await request(app)
      .get('/api/shorts/feed')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const likedShort = response.body.shorts.find(
      (s: any) => s.id === 'short_123456'
    );

    if (likedShort) {
      expect(likedShort.is_liked).toBe(true);
    }
  });

  it('should support category filtering', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?category=dance&limit=20')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    response.body.shorts.forEach((short: any) => {
      expect(short.category).toBe('dance');
    });
  });

  it('should work without authentication (generic feed)', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?limit=10');

    expect(response.status).toBe(200);
    expect(response.body.shorts).toBeInstanceOf(Array);
  });

  it('should handle pagination correctly', async () => {
    const page1 = await request(app)
      .get('/api/shorts/feed?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    const page2 = await request(app)
      .get('/api/shorts/feed?page=2&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    const ids1 = page1.body.shorts.map((s: any) => s.id);
    const ids2 = page2.body.shorts.map((s: any) => s.id);

    // No overlap
    const intersection = ids1.filter((id: string) => ids2.includes(id));
    expect(intersection.length).toBe(0);
  });
});
```

---

### 3.2 ショート詳細取得API

#### TC-102: GET /api/shorts/:id（正常系）

```typescript
describe('GET /api/shorts/:id', () => {
  it('should get short details with engagement data', async () => {
    const response = await request(app)
      .get('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('short_123456');
    expect(response.body.title).toBeDefined();
    expect(response.body.description).toBeDefined();
    expect(response.body.video_url).toBeDefined();
    expect(response.body.thumbnail_url).toBeDefined();
    expect(response.body.category).toBeDefined();
    expect(response.body.tags).toBeInstanceOf(Array);
    expect(response.body.view_count).toBeGreaterThanOrEqual(0);
    expect(response.body.like_count).toBeGreaterThanOrEqual(0);
    expect(response.body.comment_count).toBeGreaterThanOrEqual(0);
    expect(response.body.created_at).toBeDefined();
  });

  it('should return 404 for non-existent short', async () => {
    const response = await request(app)
      .get('/api/shorts/short_nonexistent')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('short_not_found');
  });

  it('should return 403 for private short without permission', async () => {
    const response = await request(app)
      .get('/api/shorts/short_private')
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(403);
  });

  it('should work without authentication for public shorts', async () => {
    const response = await request(app)
      .get('/api/shorts/short_public');

    expect(response.status).toBe(200);
  });
});
```

---

### 3.3 視聴記録API

#### TC-103: POST /api/shorts/:id/view（正常系）

```typescript
describe('POST /api/shorts/:id/view', () => {
  it('should record view successfully', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/view')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        watch_time_seconds: 25,
        completed: true
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('視聴を記録しました');
  });

  it('should increment view count', async () => {
    const before = await request(app)
      .get('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`);

    const initialCount = before.body.view_count;

    await request(app)
      .post('/api/shorts/short_123456/view')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ watch_time_seconds: 25, completed: true });

    const after = await request(app)
      .get('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(after.body.view_count).toBe(initialCount + 1);
  });

  it('should handle anonymous views', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/view')
      .send({
        session_id: 'sess_anonymous_123',
        watch_time_seconds: 20,
        completed: false
      });

    expect(response.status).toBe(200);
  });

  it('should validate watch_time_seconds', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/view')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        watch_time_seconds: -5,
        completed: false
      });

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent short', async () => {
    const response = await request(app)
      .post('/api/shorts/short_nonexistent/view')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ watch_time_seconds: 10 });

    expect(response.status).toBe(404);
  });
});
```

---

### 3.4 いいね機能API

#### TC-104: POST /api/shorts/:id/like（正常系）

```typescript
describe('POST /api/shorts/:id/like', () => {
  it('should like short successfully', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('いいねしました');
    expect(response.body.like_count).toBeGreaterThan(0);
  });

  it('should increment like count', async () => {
    const before = await request(app)
      .get('/api/shorts/short_new')
      .set('Authorization', `Bearer ${accessToken}`);

    const initialCount = before.body.like_count;

    await request(app)
      .post('/api/shorts/short_new/like')
      .set('Authorization', `Bearer ${accessToken}`);

    const after = await request(app)
      .get('/api/shorts/short_new')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(after.body.like_count).toBe(initialCount + 1);
  });

  it('should return 409 if already liked', async () => {
    await request(app)
      .post('/api/shorts/short_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    const response = await request(app)
      .post('/api/shorts/short_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('already_liked');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/like');

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent short', async () => {
    const response = await request(app)
      .post('/api/shorts/short_nonexistent/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
```

---

### 3.5 いいね解除API

#### TC-105: DELETE /api/shorts/:id/like（正常系）

```typescript
describe('DELETE /api/shorts/:id/like', () => {
  it('should unlike short successfully', async () => {
    // Like first
    await request(app)
      .post('/api/shorts/short_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    const response = await request(app)
      .delete('/api/shorts/short_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('いいねを解除しました');
  });

  it('should decrement like count', async () => {
    await request(app)
      .post('/api/shorts/short_test/like')
      .set('Authorization', `Bearer ${accessToken}`);

    const before = await request(app)
      .get('/api/shorts/short_test');

    const initialCount = before.body.like_count;

    await request(app)
      .delete('/api/shorts/short_test/like')
      .set('Authorization', `Bearer ${accessToken}`);

    const after = await request(app)
      .get('/api/shorts/short_test');

    expect(after.body.like_count).toBe(initialCount - 1);
  });

  it('should return 404 if not liked', async () => {
    const response = await request(app)
      .delete('/api/shorts/short_never_liked/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('like_not_found');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete('/api/shorts/short_123456/like');

    expect(response.status).toBe(401);
  });
});
```

---

### 3.6 コメント投稿API

#### TC-106: POST /api/shorts/:id/comments（正常系）

```typescript
describe('POST /api/shorts/:id/comments', () => {
  it('should post comment successfully', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '素晴らしいダンスですね！'
      });

    expect(response.status).toBe(201);
    expect(response.body.comment.id).toBeDefined();
    expect(response.body.comment.content).toBe('素晴らしいダンスですね！');
    expect(response.body.comment.user_name).toBeDefined();
    expect(response.body.comment.created_at).toBeDefined();
  });

  it('should validate comment content length', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'a'.repeat(501) // Max 500 chars
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('500文字');
  });

  it('should reject empty comment', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '   '
      });

    expect(response.status).toBe(400);
  });

  it('should sanitize comment content (XSS)', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '<script>alert("XSS")</script>素晴らしい'
      });

    expect(response.status).toBe(201);
    expect(response.body.comment.content).not.toContain('<script>');
    expect(response.body.comment.content).toContain('素晴らしい');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/comments')
      .send({ content: 'コメント' });

    expect(response.status).toBe(401);
  });

  it('should increment comment count', async () => {
    const before = await request(app)
      .get('/api/shorts/short_test2');

    const initialCount = before.body.comment_count;

    await request(app)
      .post('/api/shorts/short_test2/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '新しいコメント' });

    const after = await request(app)
      .get('/api/shorts/short_test2');

    expect(after.body.comment_count).toBe(initialCount + 1);
  });
});
```

---

### 3.7 コメント取得API

#### TC-107: GET /api/shorts/:id/comments（正常系）

```typescript
describe('GET /api/shorts/:id/comments', () => {
  it('should get comments with pagination', async () => {
    const response = await request(app)
      .get('/api/shorts/short_123456/comments?page=1&limit=20')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.comments).toBeInstanceOf(Array);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);
  });

  it('should include comment metadata', async () => {
    const response = await request(app)
      .get('/api/shorts/short_with_comments/comments?limit=1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    if (response.body.comments.length > 0) {
      const comment = response.body.comments[0];

      expect(comment.id).toBeDefined();
      expect(comment.content).toBeDefined();
      expect(comment.user_id).toBeDefined();
      expect(comment.user_name).toBeDefined();
      expect(comment.user_avatar).toBeDefined();
      expect(comment.created_at).toBeDefined();
    }
  });

  it('should sort comments by created_at descending', async () => {
    const response = await request(app)
      .get('/api/shorts/short_with_comments/comments')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const comments = response.body.comments;

    if (comments.length > 1) {
      const first = new Date(comments[0].created_at);
      const second = new Date(comments[1].created_at);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it('should work without authentication', async () => {
    const response = await request(app)
      .get('/api/shorts/short_public/comments');

    expect(response.status).toBe(200);
  });

  it('should return 404 for non-existent short', async () => {
    const response = await request(app)
      .get('/api/shorts/short_nonexistent/comments')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
```

---

## 4. E2Eテスト

### 4.1 ショート視聴完全フロー

#### TC-201: フィード視聴〜エンゲージメント

```typescript
import { test, expect } from '@playwright/test';

test.describe('Short Playback E2E', () => {
  test('should browse shorts feed and engage', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Navigate to Shorts feed
    await page.goto('/(tabs)/shorts');
    await expect(page).toHaveURL('/(tabs)/shorts');

    // Wait for first short to load
    await expect(page.locator('video')).toBeVisible({ timeout: 5000 });

    // Check video is playing
    const video = page.locator('video').first();
    const isPlaying = await video.evaluate((v: HTMLVideoElement) => !v.paused);
    expect(isPlaying).toBe(true);

    // Like the short
    await page.click('button[aria-label="いいね"]');
    await expect(page.locator('button[aria-label="いいね"][data-liked="true"]')).toBeVisible();

    // Open comments
    await page.click('button[aria-label="コメント"]');
    await expect(page.locator('text=コメント')).toBeVisible();

    // Post comment
    await page.fill('textarea[placeholder="コメントを追加"]', '素晴らしい！');
    await page.click('button:has-text("投稿")');
    await expect(page.locator('text=素晴らしい！')).toBeVisible();

    // Close comments
    await page.click('button[aria-label="閉じる"]');

    // Swipe to next short
    await page.locator('video').first().swipe({ direction: 'up', distance: 500 });

    // New short should be visible
    await expect(page.locator('video').nth(1)).toBeVisible();
  });

  test('should filter shorts by category', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/shorts');

    // Open category filter
    await page.click('button[aria-label="カテゴリ"]');
    await expect(page.locator('text=ダンス')).toBeVisible();

    // Select dance category
    await page.click('text=ダンス');

    // Wait for filtered shorts
    await expect(page.locator('video')).toBeVisible();

    // Verify category badge
    await expect(page.locator('[data-category="dance"]')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証・認可テスト

#### TC-301: エンゲージメントAPI認証

```typescript
describe('Short Playback Security', () => {
  it('should require authentication for like', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/like');

    expect(response.status).toBe(401);
  });

  it('should require authentication for comment', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/comments')
      .send({ content: 'コメント' });

    expect(response.status).toBe(401);
  });

  it('should allow anonymous view recording', async () => {
    const response = await request(app)
      .post('/api/shorts/short_public/view')
      .send({
        session_id: 'sess_anon',
        watch_time_seconds: 15
      });

    expect(response.status).toBe(200);
  });
});
```

---

### 5.2 XSS対策テスト

#### TC-302: コメントのサニタイズ

```typescript
describe('XSS Prevention in Comments', () => {
  it('should sanitize script tags', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '<script>alert("XSS")</script>コメント'
      });

    expect(response.status).toBe(201);
    expect(response.body.comment.content).not.toContain('<script>');
  });

  it('should sanitize HTML attributes', async () => {
    const response = await request(app)
      .post('/api/shorts/short_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '<img src=x onerror="alert(1)">コメント'
      });

    expect(response.status).toBe(201);
    expect(response.body.comment.content).not.toContain('onerror');
  });
});
```

---

### 5.3 レート制限テスト

#### TC-303: コメント投稿制限

```typescript
describe('Rate Limiting', () => {
  it('should limit comment posting to 10 per minute', async () => {
    const promises = [];

    for (let i = 0; i < 15; i++) {
      promises.push(
        request(app)
          .post('/api/shorts/short_123456/comments')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ content: `Comment ${i}` })
      );
    }

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].body.error).toContain('rate_limit');
  });

  it('should limit like actions to 100 per minute', async () => {
    const promises = [];

    for (let i = 0; i < 120; i++) {
      promises.push(
        request(app)
          .post(`/api/shorts/short_${i}/like`)
          .set('Authorization', `Bearer ${accessToken}`)
      );
    }

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 フィード読み込み速度

#### TC-401: フィード応答時間（P95 < 500ms）

```typescript
describe('Short Feed Performance', () => {
  it('should load feed within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/shorts/feed?limit=20')
        .set('Authorization', `Bearer ${accessToken}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });

  it('should record view within 200ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .post('/api/shorts/short_123456/view')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ watch_time_seconds: 20, completed: true });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(200);
  });
});
```

---

### 6.2 負荷テスト（k6）

#### TC-402: フィード同時アクセス

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const params = {
    headers: {
      'Authorization': `Bearer ${__ENV.ACCESS_TOKEN}`,
    },
  };

  const res = http.get(
    `http://localhost:3000/api/shorts/feed?page=${__ITER}&limit=20`,
    params
  );

  check(res, {
    'feed loaded': (r) => r.status === 200,
    'has shorts': (r) => JSON.parse(r.body).shorts.length > 0,
  });

  sleep(1);
}
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const testShorts = {
  public: {
    id: 'short_public',
    title: '公開ショート',
    privacy: 'public',
    view_count: 1000,
    like_count: 50,
    comment_count: 10,
  },

  withComments: {
    id: 'short_with_comments',
    title: 'コメント付きショート',
    comment_count: 25,
  },

  popular: {
    id: 'short_popular',
    title: '人気ショート',
    view_count: 100000,
    like_count: 5000,
    comment_count: 500,
  },
};

export const testComments = [
  {
    id: 'comment_001',
    content: '素晴らしいダンスですね！',
    user_name: '山田太郎',
  },
  {
    id: 'comment_002',
    content: 'すごい！',
    user_name: '田中花子',
  },
];
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（フィードアルゴリズム、視聴完了判定）
- 統合テスト: 主要API 100%（全7エンドポイント）
- E2Eテスト: クリティカルパス 100%（フィード視聴〜エンゲージメント）
- セキュリティテスト: 認証、XSS、レート制限 100%
- パフォーマンステスト: P95応答時間、同時アクセス負荷

---

## 9. 既知の課題・制約

- フィードアルゴリズムはRedisキャッシュに依存
- 視聴完了判定は80%視聴またはリプレイで成立
- コメントのリアルタイム更新はWebSocketで実装
- いいね数のカウンターキャッシュは5分TTL
- アダルトコンテンツフィルタリングはプラン依存
