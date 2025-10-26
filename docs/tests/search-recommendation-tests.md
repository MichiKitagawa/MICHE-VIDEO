# 検索・レコメンデーション機能テスト仕様書

**参照元**: `docs/specs/features/12-search-recommendation.md`

---

## 1. 概要

### 1.1 テストの目的
検索機能とパーソナライズドレコメンデーション機能の品質保証とパフォーマンス検証を実施する。全文検索、サジェスト、トレンド、おすすめフィードについて包括的なテストを行う。

### 1.2 テスト範囲
- 検索API（動画・ショート・チャンネル）
- 検索サジェストAPI
- トレンド動画・ショート取得API
- パーソナライズドおすすめフィードAPI
- 関連動画取得API
- 検索履歴保存・削除API
- 人気検索ワード取得API
- セキュリティ（認証、XSS、SQLインジェクション、レート制限）
- パフォーマンス基準

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+（全文検索）
- Elasticsearch（オプション）
- Jest 29+、Supertest、Playwright

### 1.4 依存関係
- データベース: `search_queries`, `popular_searches`, `trending_videos`, `user_recommendations`, `search_index`
- 関連機能: 動画管理、動画再生、ショート管理

---

## 2. ユニットテスト

### 2.1 検索クエリバリデーション

#### TC-001: 検索クエリ検証（正常系）

```typescript
import { validateSearchQuery } from '@/lib/search/validation';

describe('Search Query Validation', () => {
  it('should accept valid search query', () => {
    const result = validateSearchQuery('プログラミング');

    expect(result.isValid).toBe(true);
    expect(result.query).toBe('プログラミング');
  });

  it('should accept minimum length (2 characters)', () => {
    const result = validateSearchQuery('AB');

    expect(result.isValid).toBe(true);
  });

  it('should accept maximum length (200 characters)', () => {
    const longQuery = 'a'.repeat(200);
    const result = validateSearchQuery(longQuery);

    expect(result.isValid).toBe(true);
  });

  it('should accept Unicode characters (Japanese)', () => {
    const result = validateSearchQuery('初心者向けプログラミング講座');

    expect(result.isValid).toBe(true);
  });

  it('should trim whitespace', () => {
    const result = validateSearchQuery('  プログラミング  ');

    expect(result.query).toBe('プログラミング');
  });
});
```

#### TC-002: 検索クエリ検証（異常系）

```typescript
describe('Search Query Validation - Error Cases', () => {
  it('should reject query with less than 2 characters', () => {
    const result = validateSearchQuery('a');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('検索クエリは2文字以上必要です');
  });

  it('should reject query exceeding 200 characters', () => {
    const longQuery = 'a'.repeat(201);
    const result = validateSearchQuery(longQuery);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('200文字');
  });

  it('should reject empty query', () => {
    const result = validateSearchQuery('');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('検索クエリは必須です');
  });

  it('should reject whitespace-only query', () => {
    const result = validateSearchQuery('   ');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('検索クエリは必須です');
  });
});
```

---

### 2.2 レコメンデーションスコア計算

#### TC-003: おすすめスコア計算（視聴履歴ベース）

```typescript
import { calculateRecommendationScore } from '@/lib/recommendation/scoring';

describe('Recommendation Score Calculation', () => {
  it('should calculate score based on watch history', () => {
    const userProfile = {
      watchedCategories: ['education', 'technology'],
      watchedTags: ['プログラミング', 'JavaScript'],
      followedChannels: ['ch_123', 'ch_456']
    };

    const video = {
      category: 'education',
      tags: ['プログラミング', 'TypeScript'],
      channel_id: 'ch_789'
    };

    const score = calculateRecommendationScore(video, userProfile);

    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it('should prioritize followed channels', () => {
    const userProfile = {
      watchedCategories: ['education'],
      watchedTags: [],
      followedChannels: ['ch_123']
    };

    const videoFromFollowed = {
      category: 'education',
      tags: [],
      channel_id: 'ch_123'
    };

    const videoFromUnfollowed = {
      category: 'education',
      tags: [],
      channel_id: 'ch_999'
    };

    const scoreFollowed = calculateRecommendationScore(videoFromFollowed, userProfile);
    const scoreUnfollowed = calculateRecommendationScore(videoFromUnfollowed, userProfile);

    expect(scoreFollowed).toBeGreaterThan(scoreUnfollowed);
  });

  it('should calculate trending boost', () => {
    const userProfile = {
      watchedCategories: [],
      watchedTags: [],
      followedChannels: []
    };

    const trendingVideo = {
      category: 'entertainment',
      tags: [],
      channel_id: 'ch_999',
      trending_score: 0.95,
      views_24h: 100000
    };

    const score = calculateRecommendationScore(trendingVideo, userProfile);

    expect(score).toBeGreaterThan(0.3);
  });
});
```

---

### 2.3 Elasticsearchクエリビルダー

#### TC-004: 検索クエリ構築

```typescript
import { buildElasticsearchQuery } from '@/lib/search/elasticsearch';

describe('Elasticsearch Query Builder', () => {
  it('should build basic search query', () => {
    const query = buildElasticsearchQuery({
      q: 'プログラミング',
      type: 'video'
    });

    expect(query.query.bool.must).toContainEqual({
      multi_match: {
        query: 'プログラミング',
        fields: ['title^3', 'description', 'tags^2']
      }
    });
    expect(query.query.bool.filter).toContainEqual({
      term: { content_type: 'video' }
    });
  });

  it('should add category filter', () => {
    const query = buildElasticsearchQuery({
      q: 'プログラミング',
      type: 'video',
      category: 'education'
    });

    expect(query.query.bool.filter).toContainEqual({
      term: { category: 'education' }
    });
  });

  it('should add upload date filter', () => {
    const query = buildElasticsearchQuery({
      q: 'プログラミング',
      type: 'video',
      upload_date: 'week'
    });

    expect(query.query.bool.filter).toContainEqual({
      range: {
        created_at: {
          gte: expect.any(String)
        }
      }
    });
  });

  it('should add duration filter', () => {
    const query = buildElasticsearchQuery({
      q: 'プログラミング',
      type: 'video',
      duration: 'medium'
    });

    expect(query.query.bool.filter).toContainEqual({
      range: {
        duration: {
          gte: 240,
          lte: 1200
        }
      }
    });
  });
});
```

---

### 2.4 アダルトコンテンツフィルタリング

#### TC-005: プランベースのアダルトコンテンツフィルタ

```typescript
import { filterAdultContent } from '@/lib/search/filters';

describe('Adult Content Filtering', () => {
  it('should exclude adult content for Free plan', () => {
    const results = [
      { id: 'vid_1', is_adult: false, title: '通常動画' },
      { id: 'vid_2', is_adult: true, title: 'アダルト動画' },
      { id: 'vid_3', is_adult: false, title: '通常動画2' }
    ];

    const filtered = filterAdultContent(results, 'free');

    expect(filtered).toHaveLength(2);
    expect(filtered.find(v => v.is_adult)).toBeUndefined();
  });

  it('should exclude adult content for Premium plan', () => {
    const results = [
      { id: 'vid_1', is_adult: false, title: '通常動画' },
      { id: 'vid_2', is_adult: true, title: 'アダルト動画' }
    ];

    const filtered = filterAdultContent(results, 'premium');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].is_adult).toBe(false);
  });

  it('should include adult content for Premium+ plan with age verification', () => {
    const results = [
      { id: 'vid_1', is_adult: false, title: '通常動画' },
      { id: 'vid_2', is_adult: true, title: 'アダルト動画' }
    ];

    const filtered = filterAdultContent(results, 'premium_plus', { isAgeVerified: true });

    expect(filtered).toHaveLength(2);
  });

  it('should exclude adult content for Premium+ plan without age verification', () => {
    const results = [
      { id: 'vid_1', is_adult: false, title: '通常動画' },
      { id: 'vid_2', is_adult: true, title: 'アダルト動画' }
    ];

    const filtered = filterAdultContent(results, 'premium_plus', { isAgeVerified: false });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].is_adult).toBe(false);
  });
});
```

---

## 3. 統合テスト

### 3.1 検索API

#### TC-101: GET /api/search（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('GET /api/search', () => {
  it('should search videos successfully', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        limit: 20
      });

    expect(response.status).toBe(200);
    expect(response.body.query).toBe('プログラミング');
    expect(response.body.results.videos).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);

    response.body.results.videos.forEach((video: any) => {
      expect(video.id).toBeDefined();
      expect(video.title).toBeDefined();
      expect(video.thumbnail_url).toBeDefined();
      expect(video.user_name).toBeDefined();
      expect(video.category).toBeDefined();
      expect(video.duration).toBeGreaterThan(0);
      expect(video.view_count).toBeGreaterThanOrEqual(0);
      expect(video.relevance_score).toBeGreaterThan(0);
    });
  });

  it('should search all content types', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'all',
        limit: 20
      });

    expect(response.status).toBe(200);
    expect(response.body.results.videos).toBeInstanceOf(Array);
    expect(response.body.results.shorts).toBeInstanceOf(Array);
    expect(response.body.results.channels).toBeInstanceOf(Array);
  });

  it('should apply category filter', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        category: 'education'
      });

    expect(response.status).toBe(200);
    response.body.results.videos.forEach((video: any) => {
      expect(video.category).toBe('education');
    });
  });

  it('should apply upload date filter', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        upload_date: 'week'
      });

    expect(response.status).toBe(200);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    response.body.results.videos.forEach((video: any) => {
      expect(new Date(video.created_at)).toBeInstanceOf(Date);
      expect(new Date(video.created_at).getTime()).toBeGreaterThan(oneWeekAgo.getTime());
    });
  });

  it('should apply duration filter', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        duration: 'medium'
      });

    expect(response.status).toBe(200);
    response.body.results.videos.forEach((video: any) => {
      expect(video.duration).toBeGreaterThanOrEqual(240);
      expect(video.duration).toBeLessThanOrEqual(1200);
    });
  });

  it('should sort by view count', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        type: 'video',
        sort: 'view_count'
      });

    expect(response.status).toBe(200);
    const viewCounts = response.body.results.videos.map((v: any) => v.view_count);
    const sortedViewCounts = [...viewCounts].sort((a, b) => b - a);
    expect(viewCounts).toEqual(sortedViewCounts);
  });

  it('should reject query with less than 2 characters', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: 'a' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('query_too_short');
  });

  it('should return empty results for no matches', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: 'xyzabc123nonexistent' });

    expect(response.status).toBe(200);
    expect(response.body.results.videos).toHaveLength(0);
    expect(response.body.message).toBe('検索結果が見つかりませんでした');
  });
});
```

---

### 3.2 検索サジェストAPI

#### TC-102: GET /api/search/suggest（正常系）

```typescript
describe('GET /api/search/suggest', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should retrieve search suggestions', async () => {
    const response = await request(app)
      .get('/api/search/suggest')
      .query({ q: 'プロ', limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.suggestions).toBeInstanceOf(Array);
    expect(response.body.suggestions.length).toBeLessThanOrEqual(10);

    response.body.suggestions.forEach((suggestion: any) => {
      expect(suggestion.query).toBeDefined();
      expect(suggestion.type).toMatch(/^(popular|history)$/);
      expect(suggestion.query.toLowerCase()).toContain('プロ'.toLowerCase());
    });
  });

  it('should include user search history when authenticated', async () => {
    await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ q: 'プログラミング入門' });

    const response = await request(app)
      .get('/api/search/suggest')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ q: 'プロ' });

    expect(response.status).toBe(200);
    const historyItems = response.body.suggestions.filter((s: any) => s.type === 'history');
    expect(historyItems.length).toBeGreaterThan(0);
  });

  it('should include popular searches', async () => {
    const response = await request(app)
      .get('/api/search/suggest')
      .query({ q: 'プロ' });

    expect(response.status).toBe(200);
    const popularItems = response.body.suggestions.filter((s: any) => s.type === 'popular');
    expect(popularItems.length).toBeGreaterThan(0);
    expect(popularItems[0].search_count).toBeGreaterThan(0);
  });

  it('should reject query with less than 2 characters', async () => {
    const response = await request(app)
      .get('/api/search/suggest')
      .query({ q: 'a' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('query_too_short');
  });
});
```

---

### 3.3 トレンド動画取得API

#### TC-103: GET /api/search/trending（正常系）

```typescript
describe('GET /api/search/trending', () => {
  it('should retrieve trending videos (24h)', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '24h', limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('24h');
    expect(response.body.trending_videos).toBeInstanceOf(Array);
    expect(response.body.trending_videos.length).toBeLessThanOrEqual(20);

    response.body.trending_videos.forEach((item: any, index: number) => {
      expect(item.rank).toBe(index + 1);
      expect(item.video).toBeDefined();
      expect(item.video.id).toBeDefined();
      expect(item.video.title).toBeDefined();
      expect(item.video.views_24h).toBeGreaterThan(0);
      expect(item.video.trending_score).toBeGreaterThan(0);
    });
  });

  it('should retrieve trending videos (7d)', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '7d' });

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('7d');
  });

  it('should retrieve trending videos (30d)', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '30d' });

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('30d');
  });

  it('should apply category filter', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '24h', category: 'gaming' });

    expect(response.status).toBe(200);
    response.body.trending_videos.forEach((item: any) => {
      expect(item.video.category).toBe('gaming');
    });
  });

  it('should sort by trending score descending', async () => {
    const response = await request(app)
      .get('/api/search/trending')
      .query({ period: '24h' });

    expect(response.status).toBe(200);
    const scores = response.body.trending_videos.map((item: any) => item.video.trending_score);
    const sortedScores = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sortedScores);
  });
});
```

---

### 3.4 パーソナライズドおすすめフィードAPI

#### TC-104: GET /api/recommendations/feed（正常系）

```typescript
describe('GET /api/recommendations/feed', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should retrieve personalized recommendations', async () => {
    const response = await request(app)
      .get('/api/recommendations/feed')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toBeInstanceOf(Array);
    expect(response.body.recommendations.length).toBeLessThanOrEqual(20);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);
    expect(response.body.pagination.has_more).toBeDefined();

    response.body.recommendations.forEach((rec: any) => {
      expect(rec.video).toBeDefined();
      expect(rec.video.id).toBeDefined();
      expect(rec.video.title).toBeDefined();
      expect(rec.reason).toMatch(/^(watch_history|liked_videos|followed_channels|trending|category)$/);
      expect(rec.reason_text).toBeDefined();
      expect(rec.score).toBeGreaterThan(0);
      expect(rec.score).toBeLessThanOrEqual(1.0);
    });
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/recommendations/feed');

    expect(response.status).toBe(401);
  });

  it('should support pagination', async () => {
    const page1 = await request(app)
      .get('/api/recommendations/feed')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 10 });

    const page2 = await request(app)
      .get('/api/recommendations/feed')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 2, limit: 10 });

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    expect(page1.body.recommendations[0].video.id).not.toBe(page2.body.recommendations[0].video.id);
  });
});
```

---

### 3.5 関連動画取得API

#### TC-105: GET /api/videos/:id/recommendations（正常系）

```typescript
describe('GET /api/videos/:id/recommendations', () => {
  let videoId: string;
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    const videoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'テスト動画',
        category: 'education',
        tags: ['プログラミング', 'JavaScript']
      });
    videoId = videoRes.body.video.id;
  });

  it('should retrieve related videos', async () => {
    const response = await request(app)
      .get(`/api/videos/${videoId}/recommendations`)
      .query({ limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.video_id).toBe(videoId);
    expect(response.body.recommendations).toBeInstanceOf(Array);
    expect(response.body.recommendations.length).toBeLessThanOrEqual(10);

    response.body.recommendations.forEach((video: any) => {
      expect(video.id).toBeDefined();
      expect(video.title).toBeDefined();
      expect(video.category).toBeDefined();
      expect(video.score).toBeGreaterThan(0);
      expect(video.reason).toMatch(/^(category|tags|channel)$/);
    });
  });

  it('should prioritize same category videos', async () => {
    const response = await request(app)
      .get(`/api/videos/${videoId}/recommendations`)
      .query({ limit: 10 });

    expect(response.status).toBe(200);
    const sameCategoryVideos = response.body.recommendations.filter(
      (v: any) => v.category === 'education'
    );
    expect(sameCategoryVideos.length).toBeGreaterThan(0);
  });

  it('should return 404 for non-existent video', async () => {
    const response = await request(app)
      .get('/api/videos/vid_nonexistent/recommendations');

    expect(response.status).toBe(404);
  });
});
```

---

### 3.6 検索履歴保存API

#### TC-106: POST /api/search/history（正常系）

```typescript
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
```

---

### 3.7 検索履歴削除API

#### TC-107: DELETE /api/search/history（正常系）

```typescript
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
```

---

## 4. E2Eテスト

### 4.1 検索から動画視聴までのフロー

#### TC-201: 検索完全フロー

```typescript
import { test, expect } from '@playwright/test';

test.describe('Search E2E - Full Flow', () => {
  test('should complete full search to playback flow', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.click('input[placeholder="検索"]');
    await page.fill('input[placeholder="検索"]', 'プロ');

    await expect(page.locator('.search-suggestions')).toBeVisible();
    await expect(page.locator('.search-suggestions .suggestion-item')).toHaveCount.greaterThan(0);

    await page.fill('input[placeholder="検索"]', 'プログラミング');
    await page.press('input[placeholder="検索"]', 'Enter');

    await expect(page.url()).toContain('/search');
    await expect(page.locator('h1')).toContainText('プログラミング');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    await page.click('button:has-text("フィルター")');
    await expect(page.locator('.filter-modal')).toBeVisible();

    await page.click('input[value="education"]');
    await page.click('button:has-text("適用")');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    await page.click('.video-card:first-child');

    await expect(page.locator('video')).toBeVisible();

    await expect(page.locator('.related-videos')).toBeVisible();
    await expect(page.locator('.related-videos .video-card')).toHaveCount.greaterThan(0);

    await page.click('video');
    await expect(page.locator('video')).toHaveAttribute('playing', '');
  });
});
```

---

### 4.2 おすすめフィードから視聴フロー

#### TC-202: おすすめフィード完全フロー

```typescript
test.describe('Recommendations E2E - Feed Flow', () => {
  test('should complete recommendation feed to playback flow', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/videos');
    await expect(page.locator('h1')).toContainText('おすすめ');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    const firstVideo = page.locator('.video-card:first-child');
    await expect(firstVideo.locator('.recommendation-reason')).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const videoCountAfterScroll = await page.locator('.video-card').count();
    expect(videoCountAfterScroll).toBeGreaterThan(20);

    await page.click('.video-card:first-child');

    await expect(page.locator('video')).toBeVisible();

    await expect(page.locator('.recommendation-info')).toBeVisible();
  });
});
```

---

### 4.3 トレンド動画視聴フロー

#### TC-203: トレンド動画フロー

```typescript
test.describe('Trending E2E - Trending Flow', () => {
  test('should view trending videos', async ({ page }) => {
    await page.goto('/trending');

    await expect(page.locator('h1')).toContainText('トレンド');
    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    const firstVideo = page.locator('.video-card:first-child');
    await expect(firstVideo.locator('.rank')).toContainText('1');

    await page.click('button:has-text("24時間")');
    await page.click('text=7日間');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    await page.click('select[name="category"]');
    await page.selectOption('select[name="category"]', 'gaming');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    await page.click('.video-card:first-child');

    await expect(page.locator('video')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証テスト

#### TC-301: 検索API認証

```typescript
describe('Search Security - Authentication', () => {
  it('should allow search without authentication', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: 'プログラミング' });

    expect(response.status).toBe(200);
  });

  it('should require authentication for recommendations feed', async () => {
    const response = await request(app)
      .get('/api/recommendations/feed');

    expect(response.status).toBe(401);
  });

  it('should require authentication for search history', async () => {
    const response = await request(app)
      .post('/api/search/history')
      .send({ query: 'プログラミング' });

    expect(response.status).toBe(401);
  });
});
```

---

### 5.2 XSS対策テスト

#### TC-302: 検索クエリのサニタイズ

```typescript
describe('Search Security - XSS Prevention', () => {
  it('should sanitize search query (XSS)', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: '<script>alert("XSS")</script>プログラミング' });

    expect(response.status).toBe(200);
    expect(response.body.query).not.toContain('<script>');
  });

  it('should sanitize search suggestions', async () => {
    const userToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' })).body.access_token;

    await request(app)
      .post('/api/search/history')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ query: '<img src=x onerror="alert(1)">プログラミング' });

    const response = await request(app)
      .get('/api/search/suggest')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ q: 'プロ' });

    expect(response.status).toBe(200);
    response.body.suggestions.forEach((suggestion: any) => {
      expect(suggestion.query).not.toContain('onerror');
      expect(suggestion.query).not.toContain('<img');
    });
  });
});
```

---

### 5.3 SQLインジェクション対策テスト

#### TC-303: SQLインジェクション対策

```typescript
describe('Search Security - SQL Injection Prevention', () => {
  it('should prevent SQL injection in search query', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ q: "'; DROP TABLE videos; --" });

    expect(response.status).toBe(200);
    expect(response.body.results).toBeDefined();
  });

  it('should prevent SQL injection in category filter', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'プログラミング',
        category: "education' OR '1'='1"
      });

    expect(response.status).toBe(200);
  });
});
```

---

### 5.4 レート制限テスト

#### TC-304: 検索レート制限

```typescript
describe('Search Security - Rate Limiting', () => {
  it('should enforce rate limit for search (100 requests/min)', async () => {
    const requests = [];

    for (let i = 0; i < 101; i++) {
      requests.push(
        request(app)
          .get('/api/search')
          .query({ q: 'test' })
      );
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  it('should enforce rate limit for suggest (200 requests/min)', async () => {
    const requests = [];

    for (let i = 0; i < 201; i++) {
      requests.push(
        request(app)
          .get('/api/search/suggest')
          .query({ q: 'te' })
      );
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 検索API応答時間テスト

#### TC-401: 検索パフォーマンス（< 500ms）

```typescript
describe('Search Performance - Response Time', () => {
  it('should respond within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/search')
        .query({ q: 'プログラミング', type: 'video' });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });
});
```

#### TC-402: サジェストパフォーマンス（< 200ms）

```typescript
describe('Suggest Performance - Response Time', () => {
  it('should respond within 200ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/search/suggest')
        .query({ q: 'プロ' });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(200);
  });
});
```

#### TC-403: おすすめフィードパフォーマンス（< 800ms）

```typescript
describe('Recommendations Performance - Response Time', () => {
  it('should respond within 800ms (P95)', async () => {
    const userToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' })).body.access_token;

    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/recommendations/feed')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 20 });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(800);
  });
});
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const searchTestData = {
  validSearchQuery: {
    q: 'プログラミング',
    type: 'video',
    limit: 20
  },
  searchWithFilters: {
    q: 'プログラミング',
    type: 'video',
    category: 'education',
    upload_date: 'week',
    duration: 'medium',
    sort: 'view_count'
  },
  minimumQuery: {
    q: 'AB',
    type: 'all'
  },
  maximumQuery: {
    q: 'a'.repeat(200),
    type: 'video'
  },
  trendingQuery: {
    period: '24h',
    category: 'gaming',
    limit: 20
  },
  recommendationQuery: {
    page: 1,
    limit: 20
  }
};

export const mockSearchResults = {
  videos: [
    {
      id: 'vid_123456',
      title: 'プログラミング入門',
      description: '初心者向けのプログラミング講座',
      thumbnail_url: 'https://cdn.example.com/thumbnails/vid_123456.jpg',
      user_name: '田中太郎',
      user_avatar: 'https://cdn.example.com/avatars/usr_789.jpg',
      category: 'education',
      duration: 600,
      view_count: 12345,
      created_at: '2025-10-20T12:00:00Z',
      relevance_score: 0.95
    }
  ],
  shorts: [],
  channels: []
};
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（検索クエリ検証、スコア計算、フィルタリング）
- 統合テスト: 主要API 100%（全7エンドポイント）
- E2Eテスト: クリティカルパス 100%（検索→視聴、おすすめ→視聴、トレンド）
- セキュリティテスト: XSS対策、SQLインジェクション対策、レート制限 100%
- パフォーマンステスト: 検索 < 500ms、サジェスト < 200ms、おすすめ < 800ms

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
npm run test:unit:search

# 統合テスト
npm run test:integration:search

# E2Eテスト
npm run test:e2e:search

# パフォーマンステスト
k6 run tests/performance/search.js

# 全テスト実行
npm run test:search
```

### 9.3 CI/CD統合
- GitHub Actions でPR時に自動実行
- テストカバレッジレポート生成
- パフォーマンステスト結果のトレンド監視

---

## 10. 既知の課題・制約

- 日本語全文検索の精度向上（形態素解析の改善）
- フィルターバブル対策（多様性スコアの導入）
- 検索インデックスの更新遅延（リアルタイム更新の実装）
- おすすめアルゴリズムの精度検証（A/Bテスト実施）
- 大量検索時のパフォーマンス（キャッシュ戦略の最適化）
