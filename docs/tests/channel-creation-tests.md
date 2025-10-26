# チャンネル作成・管理機能テスト仕様書

**参照元**: `docs/specs/features/13-channel-creation.md`

---

## 1. 概要

### 1.1 テストの目的
クリエイターダッシュボード、チャンネル管理、アナリティクス機能の品質保証とパフォーマンス検証を実施する。チャンネル作成、コンテンツ管理、統計分析について包括的なテストを行う。

### 1.2 テスト範囲
- クリエイター申請API
- チャンネル情報取得・更新API
- アバター・バナー画像更新API
- ダッシュボード概要取得API
- アナリティクス詳細取得API
- チャンネル公開ページAPI
- コンテンツパフォーマンス取得API
- セキュリティ（認証、XSS、画像アップロード）
- パフォーマンス基準

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+
- Redis（キャッシュ）
- Jest 29+、Supertest、Playwright

### 1.4 依存関係
- データベース: `channels`, `channel_links`, `creator_applications`, `analytics_snapshots`, `content_analytics`
- 関連機能: 認証、動画管理、ショート管理、収益管理

---

## 2. ユニットテスト

### 2.1 クリエイター資格検証

#### TC-001: クリエイター申請資格チェック（正常系）

```typescript
import { validateCreatorEligibility } from '@/lib/creator/validation';

describe('Creator Eligibility Validation', () => {
  it('should accept eligible user (30+ days, 10+ videos)', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      email_verified: true,
      video_count: 10
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(true);
  });

  it('should accept user with exactly 7 days old account', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      email_verified: true,
      video_count: 5
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(true);
  });

  it('should accept user with verified email', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      email_verified: true,
      video_count: 3
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(true);
  });
});
```

#### TC-002: クリエイター申請資格チェック（異常系）

```typescript
describe('Creator Eligibility Validation - Error Cases', () => {
  it('should reject user with account less than 7 days old', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      email_verified: true,
      video_count: 10
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('account_too_new');
  });

  it('should reject user without email verification', () => {
    const user = {
      id: 'usr_123',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      email_verified: false,
      video_count: 10
    };

    const result = validateCreatorEligibility(user);

    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('email_not_verified');
  });
});
```

---

### 2.2 チャンネル名バリデーション

#### TC-003: チャンネル名検証（正常系）

```typescript
import { validateChannelName } from '@/lib/channel/validation';

describe('Channel Name Validation', () => {
  it('should accept valid channel name', () => {
    const result = validateChannelName('田中太郎のチャンネル');

    expect(result.isValid).toBe(true);
  });

  it('should accept minimum length (2 characters)', () => {
    const result = validateChannelName('AB');

    expect(result.isValid).toBe(true);
  });

  it('should accept maximum length (100 characters)', () => {
    const longName = 'a'.repeat(100);
    const result = validateChannelName(longName);

    expect(result.isValid).toBe(true);
  });

  it('should accept Unicode characters (Japanese)', () => {
    const result = validateChannelName('プログラミング学習チャンネル');

    expect(result.isValid).toBe(true);
  });

  it('should allow duplicate channel names', () => {
    const result1 = validateChannelName('人気チャンネル');
    const result2 = validateChannelName('人気チャンネル');

    expect(result1.isValid).toBe(true);
    expect(result2.isValid).toBe(true);
  });
});
```

#### TC-004: チャンネル名検証（異常系）

```typescript
describe('Channel Name Validation - Error Cases', () => {
  it('should reject name with less than 2 characters', () => {
    const result = validateChannelName('A');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('チャンネル名は2文字以上必要です');
  });

  it('should reject name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = validateChannelName(longName);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('100文字');
  });

  it('should reject empty name', () => {
    const result = validateChannelName('');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('チャンネル名は必須です');
  });
});
```

---

### 2.3 アナリティクス計算

#### TC-005: アナリティクス統計計算

```typescript
import { calculateAnalytics } from '@/lib/analytics/calculations';

describe('Analytics Calculations', () => {
  it('should calculate total views correctly', () => {
    const videos = [
      { views: 1000, watch_time: 5000, likes: 100 },
      { views: 2000, watch_time: 8000, likes: 200 },
      { views: 1500, watch_time: 6000, likes: 150 }
    ];

    const analytics = calculateAnalytics(videos);

    expect(analytics.total_views).toBe(4500);
    expect(analytics.total_watch_time).toBe(19000);
    expect(analytics.total_likes).toBe(450);
  });

  it('should calculate average view duration', () => {
    const videos = [
      { views: 100, watch_time: 30000, duration: 60000 },
      { views: 200, watch_time: 80000, duration: 120000 }
    ];

    const analytics = calculateAnalytics(videos);

    expect(analytics.avg_view_duration).toBeCloseTo(366.67, 2);
  });

  it('should calculate engagement metrics', () => {
    const videos = [
      { views: 1000, likes: 100, comments: 50, shares: 25 }
    ];

    const analytics = calculateAnalytics(videos);

    expect(analytics.like_rate).toBe(0.10);
    expect(analytics.comment_rate).toBe(0.05);
  });
});
```

---

## 3. 統合テスト

### 3.1 クリエイター申請API

#### TC-101: POST /api/creators/apply（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('POST /api/creators/apply', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should create creator application successfully', async () => {
    const response = await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(201);
    expect(response.body.application).toBeDefined();
    expect(response.body.application.id).toBeDefined();
    expect(response.body.application.status).toBe('approved');
    expect(response.body.application.applied_at).toBeDefined();
    expect(response.body.message).toBe('クリエイター申請が承認されました');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/creators/apply');

    expect(response.status).toBe(401);
  });

  it('should reject duplicate application', async () => {
    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${userToken}`);

    const response = await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('creator_application_exists');
  });
});
```

---

### 3.2 クリエイター申請ステータス取得API

#### TC-102: GET /api/creators/application/status（正常系）

```typescript
describe('GET /api/creators/application/status', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${userToken}`);
  });

  it('should retrieve application status', async () => {
    const response = await request(app)
      .get('/api/creators/application/status')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.application).toBeDefined();
    expect(response.body.application.status).toMatch(/^(pending|approved|rejected)$/);
    expect(response.body.application.applied_at).toBeDefined();
  });

  it('should return 404 if no application exists', async () => {
    const newUserRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'TestPass123!',
        display_name: '新規ユーザー'
      });

    const response = await request(app)
      .get('/api/creators/application/status')
      .set('Authorization', `Bearer ${newUserRes.body.access_token}`);

    expect(response.status).toBe(404);
  });
});
```

---

### 3.3 チャンネル情報更新API

#### TC-103: PATCH /api/channels/my-channel（正常系）

```typescript
describe('PATCH /api/channels/my-channel', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);
  });

  it('should update channel information successfully', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: '田中太郎のプログラミングチャンネル',
        description: '初心者向けのプログラミング講座を配信しています',
        links: [
          { platform: 'twitter', url: 'https://twitter.com/tanaka' },
          { platform: 'instagram', url: 'https://instagram.com/tanaka' }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.channel).toBeDefined();
    expect(response.body.channel.id).toBeDefined();
    expect(response.body.channel.name).toBe('田中太郎のプログラミングチャンネル');
    expect(response.body.channel.description).toBe('初心者向けのプログラミング講座を配信しています');
    expect(response.body.channel.updated_at).toBeDefined();
  });

  it('should require creator permission', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${userRes.body.access_token}`)
      .send({ name: '新しいチャンネル名' });

    expect(response.status).toBe(403);
  });

  it('should validate channel name length', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ name: 'A' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_channel_name');
  });
});
```

---

### 3.4 チャンネル詳細取得API

#### TC-104: GET /api/channels/:id（正常系）

```typescript
describe('GET /api/channels/:id', () => {
  let channelId: string;

  beforeEach(async () => {
    const creatorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorRes.body.access_token}`);

    const channelRes = await request(app)
      .get('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorRes.body.access_token}`);

    channelId = channelRes.body.id;
  });

  it('should retrieve channel details', async () => {
    const response = await request(app)
      .get(`/api/channels/${channelId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(channelId);
    expect(response.body.user_id).toBeDefined();
    expect(response.body.name).toBeDefined();
    expect(response.body.description).toBeDefined();
    expect(response.body.subscriber_count).toBeGreaterThanOrEqual(0);
    expect(response.body.total_views).toBeGreaterThanOrEqual(0);
    expect(response.body.total_videos).toBeGreaterThanOrEqual(0);
    expect(response.body.is_verified).toBeDefined();
    expect(response.body.created_at).toBeDefined();
    expect(response.body.links).toBeInstanceOf(Array);
    expect(response.body.videos).toBeInstanceOf(Array);
    expect(response.body.shorts).toBeInstanceOf(Array);
  });

  it('should return 404 for non-existent channel', async () => {
    const response = await request(app)
      .get('/api/channels/ch_nonexistent');

    expect(response.status).toBe(404);
  });
});
```

---

### 3.5 アナリティクス概要取得API

#### TC-105: GET /api/analytics/overview（正常系）

```typescript
describe('GET /api/analytics/overview', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);
  });

  it('should retrieve analytics overview (30d)', async () => {
    const response = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ period: '30d' });

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('30d');
    expect(response.body.total_views).toBeGreaterThanOrEqual(0);
    expect(response.body.total_watch_time_hours).toBeGreaterThanOrEqual(0);
    expect(response.body.avg_view_duration_seconds).toBeGreaterThanOrEqual(0);
    expect(response.body.subscribers_gained).toBeGreaterThanOrEqual(0);
    expect(response.body.total_likes).toBeGreaterThanOrEqual(0);
    expect(response.body.views_change_percent).toBeDefined();
    expect(response.body.watch_time_change_percent).toBeDefined();
  });

  it('should retrieve analytics for different periods', async () => {
    const response7d = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ period: '7d' });

    const response90d = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ period: '90d' });

    expect(response7d.status).toBe(200);
    expect(response90d.status).toBe(200);
    expect(response7d.body.period).toBe('7d');
    expect(response90d.body.period).toBe('90d');
  });

  it('should require creator permission', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${userRes.body.access_token}`);

    expect(response.status).toBe(403);
  });
});
```

---

### 3.6 動画別アナリティクス取得API

#### TC-106: GET /api/analytics/videos/:video_id（正常系）

```typescript
describe('GET /api/analytics/videos/:video_id', () => {
  let creatorToken: string;
  let videoId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);

    const videoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ title: 'テスト動画', category: 'education' });

    videoId = videoRes.body.video.id;
  });

  it('should retrieve video analytics', async () => {
    const response = await request(app)
      .get(`/api/analytics/videos/${videoId}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.content_id).toBe(videoId);
    expect(response.body.content_type).toBe('video');
    expect(response.body.title).toBeDefined();
    expect(response.body.published_at).toBeDefined();
    expect(response.body.views).toBeGreaterThanOrEqual(0);
    expect(response.body.watch_time_hours).toBeGreaterThanOrEqual(0);
    expect(response.body.avg_view_duration).toBeGreaterThanOrEqual(0);
    expect(response.body.ctr).toBeGreaterThanOrEqual(0);
    expect(response.body.likes).toBeGreaterThanOrEqual(0);
    expect(response.body.comments).toBeGreaterThanOrEqual(0);
    expect(response.body.shares).toBeGreaterThanOrEqual(0);
    expect(response.body.views_timeline).toBeInstanceOf(Array);
    expect(response.body.traffic_sources).toBeDefined();
  });

  it('should require ownership', async () => {
    const otherUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${otherUserRes.body.access_token}`);

    const response = await request(app)
      .get(`/api/analytics/videos/${videoId}`)
      .set('Authorization', `Bearer ${otherUserRes.body.access_token}`);

    expect(response.status).toBe(403);
  });
});
```

---

### 3.7 視聴者統計取得API

#### TC-107: GET /api/analytics/audience（正常系）

```typescript
describe('GET /api/analytics/audience', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);
  });

  it('should retrieve audience demographics', async () => {
    const response = await request(app)
      .get('/api/analytics/audience')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ period: '30d' });

    expect(response.status).toBe(200);
    expect(response.body.age_distribution).toBeDefined();
    expect(response.body.age_distribution['18-24']).toBeGreaterThanOrEqual(0);
    expect(response.body.gender_distribution).toBeDefined();
    expect(response.body.gender_distribution.male).toBeGreaterThanOrEqual(0);
    expect(response.body.top_regions).toBeInstanceOf(Array);
    expect(response.body.devices).toBeDefined();
    expect(response.body.devices.mobile).toBeGreaterThanOrEqual(0);
  });
});
```

---

## 4. E2Eテスト

### 4.1 クリエイター申請から承認までのフロー

#### TC-201: クリエイター申請完全フロー

```typescript
import { test, expect } from '@playwright/test';

test.describe('Creator Application E2E - Full Flow', () => {
  test('should complete creator application process', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/settings');
    await page.click('text=クリエイターになる');

    await expect(page.locator('dialog')).toBeVisible();
    await expect(page.locator('text=利用規約')).toBeVisible();

    await page.click('input[name="agree_terms"]');
    await page.click('button:has-text("申請する")');

    await expect(page.locator('text=クリエイター申請が承認されました')).toBeVisible();

    await page.goto('/creation');
    await expect(page.locator('h1')).toContainText('クリエイターダッシュボード');
  });
});
```

---

### 4.2 チャンネル設定からアナリティクス確認フロー

#### TC-202: チャンネル管理完全フロー

```typescript
test.describe('Channel Management E2E - Settings Flow', () => {
  test('should update channel settings and view analytics', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/creation');
    await page.click('text=設定');

    await page.fill('input[name="channel_name"]', '田中太郎のプログラミングチャンネル');
    await page.fill('textarea[name="description"]', '初心者向けのプログラミング講座を配信しています');

    await page.click('button:has-text("追加")');
    await page.selectOption('select[name="platform"]', 'twitter');
    await page.fill('input[name="url"]', 'https://twitter.com/tanaka');
    await page.click('button:has-text("保存")');

    await expect(page.locator('text=チャンネル情報を更新しました')).toBeVisible();

    await page.click('text=アナリティクス');

    await expect(page.locator('.analytics-overview')).toBeVisible();
    await expect(page.locator('text=総視聴回数')).toBeVisible();
    await expect(page.locator('text=総視聴時間')).toBeVisible();
    await expect(page.locator('text=新規フォロワー')).toBeVisible();

    await page.click('button:has-text("7日間")');
    await expect(page.locator('.chart')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証・認可テスト

#### TC-301: クリエイターAPI認証

```typescript
describe('Creator Security - Authentication', () => {
  it('should require authentication for creator application', async () => {
    const response = await request(app)
      .post('/api/creators/apply');

    expect(response.status).toBe(401);
  });

  it('should require creator permission for channel update', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${userRes.body.access_token}`)
      .send({ name: '新しいチャンネル名' });

    expect(response.status).toBe(403);
  });

  it('should require creator permission for analytics', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${userRes.body.access_token}`);

    expect(response.status).toBe(403);
  });
});
```

---

### 5.2 XSS対策テスト

#### TC-302: チャンネル情報のサニタイズ

```typescript
describe('Channel Security - XSS Prevention', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);
  });

  it('should sanitize channel name (XSS)', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: '<script>alert("XSS")</script>田中チャンネル'
      });

    expect(response.status).toBe(200);
    expect(response.body.channel.name).not.toContain('<script>');
  });

  it('should sanitize channel description', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        description: '<img src=x onerror="alert(1)">説明'
      });

    expect(response.status).toBe(200);
    expect(response.body.channel.description).not.toContain('onerror');
  });
});
```

---

### 5.3 画像アップロードセキュリティテスト

#### TC-303: アバター・バナー画像検証

```typescript
describe('Channel Security - Image Upload', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);
  });

  it('should reject avatar image exceeding 5MB', async () => {
    const largeImage = 'data:image/jpeg;base64,' + 'A'.repeat(6 * 1024 * 1024);

    const response = await request(app)
      .patch('/api/channels/my-channel/avatar')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ avatar: largeImage });

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('file_too_large');
  });

  it('should reject banner image exceeding 10MB', async () => {
    const largeImage = 'data:image/jpeg;base64,' + 'A'.repeat(11 * 1024 * 1024);

    const response = await request(app)
      .patch('/api/channels/my-channel/banner')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ banner: largeImage });

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('file_too_large');
  });

  it('should reject non-image files', async () => {
    const response = await request(app)
      .patch('/api/channels/my-channel/avatar')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ avatar: 'data:text/plain;base64,dGVzdA==' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_file_type');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 チャンネル情報取得パフォーマンス

#### TC-401: チャンネル情報取得（< 300ms）

```typescript
describe('Channel Performance - Response Time', () => {
  it('should respond within 300ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/channels/ch_123456');
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(300);
  });
});
```

#### TC-402: アナリティクス取得（< 2秒）

```typescript
describe('Analytics Performance - Response Time', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;
  });

  it('should respond within 2000ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${creatorToken}`)
        .query({ period: '30d' });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(2000);
  });
});
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const channelTestData = {
  validChannel: {
    name: '田中太郎のチャンネル',
    description: 'プログラミング講座を配信しています',
    links: [
      { platform: 'twitter', url: 'https://twitter.com/tanaka' },
      { platform: 'instagram', url: 'https://instagram.com/tanaka' }
    ]
  },
  minimumChannel: {
    name: 'AB'
  },
  maximumChannel: {
    name: 'a'.repeat(100),
    description: 'd'.repeat(1000)
  },
  analyticsOverview: {
    period: '30d',
    total_views: 123456,
    total_watch_time_hours: 5678,
    avg_view_duration_seconds: 300,
    subscribers_gained: 234,
    total_likes: 8901,
    views_change_percent: 15.5,
    watch_time_change_percent: 12.3
  }
};
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（資格検証、チャンネル名検証、アナリティクス計算）
- 統合テスト: 主要API 100%（全7エンドポイント）
- E2Eテスト: クリティカルパス 100%（申請→承認、設定→アナリティクス）
- セキュリティテスト: 認証、XSS対策、画像アップロード 100%
- パフォーマンステスト: チャンネル情報 < 300ms、アナリティクス < 2秒

---

## 9. テストツール・フレームワーク

### 9.1 使用ツール
- ユニットテスト: Jest 29+
- 統合テスト: Supertest
- E2Eテスト: Playwright
- パフォーマンステスト: k6
- モックデータ: faker-js

### 9.2 テスト実行コマンド
```bash
# ユニットテスト
npm run test:unit:channel

# 統合テスト
npm run test:integration:channel

# E2Eテスト
npm run test:e2e:channel

# パフォーマンステスト
k6 run tests/performance/channel.js

# 全テスト実行
npm run test:channel
```

### 9.3 CI/CD統合
- GitHub Actions でPR時に自動実行
- テストカバレッジレポート生成
- アナリティクスパフォーマンス監視

---

## 10. 既知の課題・制約

- アナリティクスの計算負荷（バッチ処理で軽減）
- 大量コンテンツのパフォーマンス（ページネーション実装）
- 画像アップロードの処理時間（非同期処理）
- リアルタイム統計の精度（キャッシュ戦略）
- チャンネル統計のキャッシュ管理（Redis TTL 1時間）
