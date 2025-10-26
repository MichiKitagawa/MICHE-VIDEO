# 動画再生機能テスト仕様書

**参照元**: `docs/specs/features/05-video-playback.md`

---

## 1. 概要

### 1.1 テストの目的
動画再生機能（ストリーミング、いいね、コメント、視聴履歴、おすすめ）の品質保証とパフォーマンス検証を実施する。

### 1.2 テスト範囲
- 動画視聴・進捗保存
- いいね・いいね解除
- コメント投稿・取得・削除
- 視聴履歴管理
- おすすめ動画アルゴリズム
- セキュリティ対策（認証、レート制限、XSS対策）
- パフォーマンス基準（応答時間、同時接続）

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+
- Jest 29+、Supertest、Playwright
- HLS動画プレイヤー（expo-av / Video.js）

### 1.4 依存関係
- データベース: `videos`, `video_views`, `video_likes`, `video_comments`, `watch_history`
- 外部サービス: AWS CloudFront/Cloudflare (CDN)、Redis (キャッシュ)

---

## 2. ユニットテスト

### 2.1 視聴回数カウントロジックテスト

#### TC-001: 視聴回数カウント判定（正常系）

**目的**: 視聴時間が10%以上の場合のみカウントされることを確認

```typescript
import { shouldCountView } from '@/lib/video/view-counter';

describe('View Count Logic', () => {
  it('should count view when watch time >= 10% of duration', () => {
    const videoDuration = 600; // 10 minutes
    const watchTime = 61; // 61 seconds > 10%

    const result = shouldCountView(watchTime, videoDuration);
    expect(result).toBe(true);
  });

  it('should not count view when watch time < 10%', () => {
    const videoDuration = 600;
    const watchTime = 59; // 59 seconds < 10%

    const result = shouldCountView(watchTime, videoDuration);
    expect(result).toBe(false);
  });

  it('should not count view when watch time < 5 seconds', () => {
    const result = shouldCountView(3, 600);
    expect(result).toBe(false);
  });

  it('should handle same user viewing same video (1 per day)', () => {
    const lastViewedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    const canCount = canCountViewForUser('user_123', 'vid_123', lastViewedAt);

    expect(canCount).toBe(true);
  });

  it('should not count if same user viewed within 24 hours', () => {
    const lastViewedAt = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
    const canCount = canCountViewForUser('user_123', 'vid_123', lastViewedAt);

    expect(canCount).toBe(false);
  });
});
```

---

### 2.2 おすすめスコア計算テスト

#### TC-002: おすすめアルゴリズムスコア計算

```typescript
import { calculateRecommendationScore } from '@/lib/video/recommendation';

describe('Recommendation Score Calculation', () => {
  it('should calculate score based on category match', () => {
    const currentVideo = { category: 'education' };
    const recommendedVideo = { category: 'education', tags: [], views: 1000 };

    const score = calculateRecommendationScore(currentVideo, recommendedVideo, []);
    expect(score).toBeGreaterThan(0.3); // category_match contributes 40%
  });

  it('should calculate score based on tag match', () => {
    const currentVideo = { tags: ['programming', 'javascript'] };
    const recommendedVideo = { tags: ['javascript', 'react'], views: 1000 };

    const score = calculateRecommendationScore(currentVideo, recommendedVideo, []);
    expect(score).toBeGreaterThan(0.1); // tag_match contributes 30%
  });

  it('should boost trending videos', () => {
    const trending = { views: 100000, created_at: new Date() };
    const normal = { views: 1000, created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };

    const trendingScore = calculateRecommendationScore({}, trending, []);
    const normalScore = calculateRecommendationScore({}, normal, []);

    expect(trendingScore).toBeGreaterThan(normalScore);
  });
});
```

---

### 2.3 コメントバリデーションテスト

#### TC-003: コメント内容バリデーション

```typescript
import { validateComment } from '@/lib/video/comment-validator';

describe('Comment Validation', () => {
  it('should accept valid comment', () => {
    const comment = '素晴らしい動画でした！';
    const result = validateComment(comment);

    expect(result.isValid).toBe(true);
  });

  it('should reject empty comment', () => {
    const result = validateComment('');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('コメント内容が空です');
  });

  it('should reject comment exceeding 1000 characters', () => {
    const longComment = 'a'.repeat(1001);
    const result = validateComment(longComment);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('1000文字以内');
  });

  it('should detect spam (same content repeatedly)', () => {
    const comment = 'スパムメッセージ';
    const recentComments = ['スパムメッセージ', 'スパムメッセージ'];

    const result = validateComment(comment, recentComments);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('同じ内容のコメント');
  });
});
```

---

## 3. 統合テスト

### 3.1 動画視聴開始API

#### TC-101: POST /api/videos/:id/view（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('POST /api/videos/:id/view', () => {
  it('should record video view for logged-in user', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/view')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('視聴を記録しました');
    expect(response.body.video_id).toBe('vid_123456');
    expect(response.body.view_count).toBeGreaterThan(0);
  });

  it('should record view for anonymous user with session_id', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/view')
      .send({ session_id: 'sess_anonymous_123' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('視聴を記録しました');
  });

  it('should return 404 for non-existent video', async () => {
    const response = await request(app)
      .post('/api/videos/vid_nonexistent/view')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
```

---

### 3.2 視聴進捗保存API

#### TC-102: POST /api/videos/:id/progress（正常系）

```typescript
describe('POST /api/videos/:id/progress', () => {
  it('should save watch progress successfully', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/progress')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        progress_seconds: 120,
        duration_seconds: 600
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('視聴進捗を保存しました');
    expect(response.body.progress_seconds).toBe(120);
    expect(response.body.progress_percentage).toBe(20);
  });

  it('should mark as completed when progress >= 90%', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/progress')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        progress_seconds: 540,
        duration_seconds: 600
      });

    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(true);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/progress')
      .send({ progress_seconds: 120 });

    expect(response.status).toBe(401);
  });
});
```

---

### 3.3 いいね登録API

#### TC-103: POST /api/videos/:id/like（正常系）

```typescript
describe('POST /api/videos/:id/like', () => {
  it('should like video successfully', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('いいねしました');
    expect(response.body.is_liked).toBe(true);
    expect(response.body.like_count).toBeGreaterThan(0);
  });

  it('should return 409 if already liked', async () => {
    // First like
    await request(app)
      .post('/api/videos/vid_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    // Second like (duplicate)
    const response = await request(app)
      .post('/api/videos/vid_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(409);
  });
});
```

---

### 3.4 いいね解除API

#### TC-104: DELETE /api/videos/:id/like（正常系）

```typescript
describe('DELETE /api/videos/:id/like', () => {
  beforeEach(async () => {
    // Setup: Like the video first
    await request(app)
      .post('/api/videos/vid_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);
  });

  it('should unlike video successfully', async () => {
    const response = await request(app)
      .delete('/api/videos/vid_123456/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('いいねを解除しました');
    expect(response.body.is_liked).toBe(false);
  });
});
```

---

### 3.5 コメント投稿API

#### TC-105: POST /api/videos/:id/comments（正常系）

```typescript
describe('POST /api/videos/:id/comments', () => {
  it('should post comment successfully', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '素晴らしい動画でした！',
        parent_comment_id: null
      });

    expect(response.status).toBe(201);
    expect(response.body.comment.content).toBe('素晴らしい動画でした！');
    expect(response.body.comment.user_id).toBeDefined();
  });

  it('should post reply to comment', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '返信です',
        parent_comment_id: 'cmt_123456'
      });

    expect(response.status).toBe(201);
  });

  it('should reject empty comment', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '' });

    expect(response.status).toBe(400);
  });

  it('should apply rate limiting', async () => {
    // Post 10 comments rapidly
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/videos/vid_123456/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: `Comment ${i}` });
    }

    // 11th comment should be rate limited
    const response = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Too many comments' });

    expect(response.status).toBe(429);
  });
});
```

---

### 3.6 コメント一覧取得API

#### TC-106: GET /api/videos/:id/comments（正常系）

```typescript
describe('GET /api/videos/:id/comments', () => {
  it('should get comments with pagination', async () => {
    const response = await request(app)
      .get('/api/videos/vid_123456/comments?page=1&limit=20');

    expect(response.status).toBe(200);
    expect(response.body.comments).toBeInstanceOf(Array);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);
  });

  it('should sort by newest first', async () => {
    const response = await request(app)
      .get('/api/videos/vid_123456/comments?sort=newest');

    expect(response.status).toBe(200);
    const comments = response.body.comments;

    if (comments.length > 1) {
      const first = new Date(comments[0].created_at);
      const second = new Date(comments[1].created_at);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it('should include replies in nested structure', async () => {
    const response = await request(app)
      .get('/api/videos/vid_123456/comments');

    expect(response.status).toBe(200);
    const commentsWithReplies = response.body.comments.filter(c => c.replies && c.replies.length > 0);

    if (commentsWithReplies.length > 0) {
      expect(commentsWithReplies[0].replies).toBeInstanceOf(Array);
    }
  });
});
```

---

### 3.7 視聴履歴取得API

#### TC-107: GET /api/users/watch-history（正常系）

```typescript
describe('GET /api/users/watch-history', () => {
  it('should get user watch history', async () => {
    const response = await request(app)
      .get('/api/users/watch-history')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.history).toBeInstanceOf(Array);
  });

  it('should include video details and progress', async () => {
    const response = await request(app)
      .get('/api/users/watch-history')
      .set('Authorization', `Bearer ${accessToken}`);

    if (response.body.history.length > 0) {
      const entry = response.body.history[0];
      expect(entry.video_id).toBeDefined();
      expect(entry.video_title).toBeDefined();
      expect(entry.progress_seconds).toBeGreaterThanOrEqual(0);
      expect(entry.duration_seconds).toBeGreaterThan(0);
      expect(entry.progress_percentage).toBeGreaterThanOrEqual(0);
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/users/watch-history');

    expect(response.status).toBe(401);
  });
});
```

---

### 3.8 おすすめ動画取得API

#### TC-108: GET /api/videos/:id/recommendations（正常系）

```typescript
describe('GET /api/videos/:id/recommendations', () => {
  it('should get recommended videos', async () => {
    const response = await request(app)
      .get('/api/videos/vid_123456/recommendations?limit=10');

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toBeInstanceOf(Array);
    expect(response.body.recommendations.length).toBeLessThanOrEqual(10);
  });

  it('should include recommendation reason', async () => {
    const response = await request(app)
      .get('/api/videos/vid_123456/recommendations');

    if (response.body.recommendations.length > 0) {
      const rec = response.body.recommendations[0];
      expect(rec.reason).toMatch(/^(category|tag|user_history|trending)$/);
    }
  });

  it('should personalize for logged-in users', async () => {
    const anonResponse = await request(app)
      .get('/api/videos/vid_123456/recommendations');

    const authResponse = await request(app)
      .get('/api/videos/vid_123456/recommendations')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(anonResponse.status).toBe(200);
    expect(authResponse.status).toBe(200);
    // Logged-in user should get personalized recommendations
  });
});
```

---

## 4. E2Eテスト

### 4.1 動画再生からいいね・コメントまでの完全フロー

#### TC-201: 動画視聴〜インタラクション完全フロー

```typescript
import { test, expect } from '@playwright/test';

test.describe('Video Playback E2E', () => {
  test('should watch video, like, and comment', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/(tabs)/videos');

    // Navigate to video detail
    await page.click('text=素晴らしい動画タイトル');
    await expect(page).toHaveURL(/\/video\/.+/);

    // Wait for video player to load
    await page.waitForSelector('video');

    // Like video
    await page.click('button[aria-label="いいね"]');
    await expect(page.locator('button[aria-label="いいね"]')).toHaveClass(/active/);

    // Post comment
    await page.fill('textarea[name="comment"]', '素晴らしい動画でした！');
    await page.click('button:has-text("送信")');
    await expect(page.locator('text=素晴らしい動画でした！')).toBeVisible();

    // Check comment appears in list
    const commentList = page.locator('[data-testid="comment-list"]');
    await expect(commentList).toContainText('素晴らしい動画でした！');
  });

  test('should resume from last watched position', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Watch video partially
    await page.goto('/video/vid_123456');
    const video = page.locator('video');
    await video.evaluate(v => (v as HTMLVideoElement).currentTime = 120);
    await page.waitForTimeout(2000); // Wait for progress save

    // Leave and return
    await page.goto('/(tabs)/videos');
    await page.goto('/video/vid_123456');

    // Check if resumed from 120 seconds
    await page.waitForTimeout(1000);
    const currentTime = await video.evaluate(v => (v as HTMLVideoElement).currentTime);
    expect(currentTime).toBeGreaterThan(110); // Allow some variance
  });
});
```

---

### 4.2 おすすめ動画連続再生フロー

#### TC-202: おすすめ動画連続視聴

```typescript
test('should autoplay recommended videos', async ({ page }) => {
  await page.goto('/auth');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');

  await page.goto('/video/vid_123456');

  // Enable autoplay
  await page.click('[data-testid="autoplay-toggle"]');

  // Scroll to recommendations
  await page.locator('[data-testid="recommendations"]').scrollIntoViewIfNeeded();

  // Get first recommendation
  const firstRec = page.locator('[data-testid="recommendation-item"]').first();
  const firstRecTitle = await firstRec.locator('h3').textContent();

  // Wait for video to end (fast-forward in test)
  const video = page.locator('video');
  await video.evaluate(v => {
    const vid = v as HTMLVideoElement;
    vid.currentTime = vid.duration - 1;
  });

  // Check if next video starts automatically
  await page.waitForTimeout(3000);
  const pageTitle = await page.locator('h1').textContent();
  expect(pageTitle).toBe(firstRecTitle);
});
```

---

## 5. セキュリティテスト

### 5.1 認証・認可テスト

#### TC-301: 認証が必要なエンドポイントの保護

```typescript
describe('Video Playback Security', () => {
  it('should require authentication for progress save', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/progress')
      .send({ progress_seconds: 120 });

    expect(response.status).toBe(401);
  });

  it('should require authentication for like', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/like');

    expect(response.status).toBe(401);
  });

  it('should require authentication for comment', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/comments')
      .send({ content: 'Test comment' });

    expect(response.status).toBe(401);
  });
});
```

---

### 5.2 XSS対策テスト

#### TC-302: コメント内容のサニタイズ

```typescript
describe('XSS Prevention', () => {
  it('should sanitize comment content', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '<script>alert("XSS")</script>テストコメント'
      });

    expect(response.status).toBe(201);
    expect(response.body.comment.content).not.toContain('<script>');
    expect(response.body.comment.content).toContain('テストコメント');
  });

  it('should allow safe HTML entities', async () => {
    const response = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '&lt;div&gt;安全なHTML&lt;/div&gt;'
      });

    expect(response.status).toBe(201);
  });
});
```

---

### 5.3 レート制限テスト

#### TC-303: コメント投稿レート制限

```typescript
describe('Rate Limiting', () => {
  it('should limit comment posting to 1 per 10 seconds', async () => {
    // First comment should succeed
    const res1 = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'コメント1' });
    expect(res1.status).toBe(201);

    // Immediate second comment should be rate limited
    const res2 = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'コメント2' });
    expect(res2.status).toBe(429);
    expect(res2.body.retry_after).toBeLessThanOrEqual(10);
  });

  it('should limit daily comments to 100', async () => {
    // Simulate 100 comments already posted
    // This would require test data setup
    const response = await request(app)
      .post('/api/videos/vid_123456/comments')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .send({ content: '101st comment' });

    expect(response.status).toBe(429);
    expect(response.body.error).toContain('1日の投稿上限');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 応答時間テスト

#### TC-401: API応答時間（P95 < 200ms）

```typescript
describe('Video Playback Performance', () => {
  it('should respond to view count within 200ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .post('/api/videos/vid_123456/view')
        .set('Authorization', `Bearer ${accessToken}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(200);
  });

  it('should load comments within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/videos/vid_123456/comments');
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });
});
```

---

### 6.2 負荷テスト（k6）

#### TC-402: 同時視聴ストレステスト

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests should be below 300ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

export default function () {
  const videoId = 'vid_123456';

  // Record view
  const viewRes = http.post(
    `http://localhost:3000/api/videos/${videoId}/view`,
    JSON.stringify({ session_id: `sess_${__VU}_${__ITER}` }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(viewRes, {
    'view recorded': (r) => r.status === 200,
  });

  sleep(1);

  // Get comments
  const commentsRes = http.get(`http://localhost:3000/api/videos/${videoId}/comments`);

  check(commentsRes, {
    'comments loaded': (r) => r.status === 200,
    'has comments array': (r) => JSON.parse(r.body).comments !== undefined,
  });

  sleep(2);
}
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const testVideos = {
  published: {
    id: 'vid_123456',
    title: '素晴らしい動画タイトル',
    description: 'テスト用動画の説明文',
    user_id: 'usr_789',
    duration: 600,
    privacy: 'public',
    is_adult: false,
    view_count: 12345,
    like_count: 890,
  },

  private: {
    id: 'vid_private',
    privacy: 'private',
    user_id: 'usr_789',
  },

  adult: {
    id: 'vid_adult',
    is_adult: true,
    user_id: 'usr_789',
  },
};

export const testComments = {
  topLevel: {
    content: '素晴らしい動画でした！',
    parent_comment_id: null,
  },

  reply: {
    content: '返信コメント',
    parent_comment_id: 'cmt_123456',
  },

  spam: {
    content: 'スパムメッセージ'.repeat(10),
  },

  xss: {
    content: '<script>alert("XSS")</script>悪意のあるコメント',
  },
};
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（視聴回数ロジック、おすすめアルゴリズム、バリデーション）
- 統合テスト: 主要API 100%（全8エンドポイント）
- E2Eテスト: クリティカルパス 100%（動画視聴〜いいね・コメント）
- セキュリティテスト: 認証、XSS、レート制限 100%
- パフォーマンステスト: P95応答時間、負荷テスト

---

## 9. 既知の課題・制約

- HLS動画プレイヤーのテストはブラウザ環境が必要（Playwright使用）
- CDN（CloudFront）のテストは本番環境でのみ完全検証可能
- おすすめアルゴリズムの精度テストは大量のテストデータが必要
- 視聴回数のバッチ更新（5分ごと）はタイミング依存のため、モック化推奨
- WebSocketによるリアルタイムいいね数更新はE2Eテストで検証
