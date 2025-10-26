# Netflixコンテンツ管理機能テスト仕様書

**参照元**: `docs/specs/features/14-netflix-content.md`

---

## 1. 概要

### 1.1 テストの目的
Netflixコンテンツ（映画・TVシリーズ）管理機能の品質保証とパフォーマンス検証を実施する。コンテンツ作成、シーズン・エピソード管理、IP権利管理、視聴フローについて包括的なテストを行う。

### 1.2 テスト範囲
- Netflixコンテンツ一覧取得API
- コンテンツ詳細取得API
- 映画・シリーズ作成API
- シーズン・エピソード作成API
- コンテンツ更新・削除API
- IP権利管理API
- ストリーミングURL取得API
- 視聴履歴・進捗保存API
- セキュリティ（Premium以上プラン確認、IP権利検証、署名付きURL）
- パフォーマンス基準

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+
- AWS MediaConvert（トランスコード）
- Jest 29+、Supertest、Playwright

### 1.4 依存関係
- データベース: `netflix_contents`, `netflix_genres`, `seasons`, `episodes`, `ip_licenses`, `netflix_watch_history`
- 関連機能: サブスクリプション管理、動画配信、CDN

---

## 2. ユニットテスト

### 2.1 IP権利バリデーション

#### TC-001: IP権利タイプ検証（正常系）

```typescript
import { validateIPLicense } from '@/lib/netflix/validation';

describe('IP License Validation', () => {
  it('should accept commercial IP license', () => {
    const license = {
      id: 'ip_001',
      license_type: '商用利用可',
      is_active: true
    };

    const result = validateIPLicense(license);

    expect(result.isValid).toBe(true);
    expect(result.canUseForNetflix).toBe(true);
  });

  it('should reject non-commercial IP license', () => {
    const license = {
      id: 'ip_002',
      license_type: '非商用のみ',
      is_active: true
    };

    const result = validateIPLicense(license);

    expect(result.isValid).toBe(true);
    expect(result.canUseForNetflix).toBe(false);
    expect(result.reason).toBe('commercial_license_required');
  });

  it('should reject inactive IP license', () => {
    const license = {
      id: 'ip_003',
      license_type: '商用利用可',
      is_active: false
    };

    const result = validateIPLicense(license);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('license_inactive');
  });
});
```

---

### 2.2 プラン制限チェック

#### TC-002: Premium以上プラン確認（正常系）

```typescript
import { checkPlanAccess } from '@/lib/netflix/access';

describe('Netflix Plan Access Check', () => {
  it('should grant access for Premium plan', () => {
    const result = checkPlanAccess('premium');

    expect(result.hasAccess).toBe(true);
  });

  it('should grant access for Premium+ plan', () => {
    const result = checkPlanAccess('premium_plus');

    expect(result.hasAccess).toBe(true);
  });

  it('should deny access for Free plan', () => {
    const result = checkPlanAccess('free');

    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('premium_required');
    expect(result.upgradePlan).toBe('premium');
  });
});
```

---

### 2.3 アダルトコンテンツアクセス検証

#### TC-003: アダルトコンテンツアクセス制限（正常系）

```typescript
import { validateAdultContentAccess } from '@/lib/netflix/adult-content';

describe('Adult Content Access Validation', () => {
  it('should allow access for Premium+ with age verification', () => {
    const result = validateAdultContentAccess({
      plan: 'premium_plus',
      isAgeVerified: true,
      age: 20
    });

    expect(result.canAccess).toBe(true);
  });

  it('should deny access for Premium+ without age verification', () => {
    const result = validateAdultContentAccess({
      plan: 'premium_plus',
      isAgeVerified: false,
      age: 20
    });

    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe('age_verification_required');
  });

  it('should deny access for underage users', () => {
    const result = validateAdultContentAccess({
      plan: 'premium_plus',
      isAgeVerified: true,
      age: 17
    });

    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe('age_restriction');
  });

  it('should deny access for Premium plan', () => {
    const result = validateAdultContentAccess({
      plan: 'premium',
      isAgeVerified: true,
      age: 20
    });

    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe('premium_plus_required');
  });
});
```

---

### 2.4 エピソードソート

#### TC-004: シーズン・エピソード番号ソート（正常系）

```typescript
import { sortEpisodes } from '@/lib/netflix/sort';

describe('Episode Sorting', () => {
  it('should sort episodes by season and episode number', () => {
    const episodes = [
      { season_number: 2, episode_number: 1, title: 'S2E1' },
      { season_number: 1, episode_number: 2, title: 'S1E2' },
      { season_number: 1, episode_number: 1, title: 'S1E1' },
      { season_number: 2, episode_number: 2, title: 'S2E2' }
    ];

    const sorted = sortEpisodes(episodes);

    expect(sorted[0].title).toBe('S1E1');
    expect(sorted[1].title).toBe('S1E2');
    expect(sorted[2].title).toBe('S2E1');
    expect(sorted[3].title).toBe('S2E2');
  });

  it('should handle non-sequential episode numbers', () => {
    const episodes = [
      { season_number: 1, episode_number: 5, title: 'E5' },
      { season_number: 1, episode_number: 1, title: 'E1' },
      { season_number: 1, episode_number: 3, title: 'E3' }
    ];

    const sorted = sortEpisodes(episodes);

    expect(sorted[0].title).toBe('E1');
    expect(sorted[1].title).toBe('E3');
    expect(sorted[2].title).toBe('E5');
  });
});
```

---

## 3. 統合テスト

### 3.1 Netflix一覧取得API

#### TC-101: GET /api/netflix（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('GET /api/netflix', () => {
  it('should retrieve all Netflix contents', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ type: 'all', limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.contents).toBeInstanceOf(Array);
    expect(response.body.total).toBeGreaterThanOrEqual(0);
    expect(response.body.offset).toBe(0);
    expect(response.body.limit).toBe(20);

    response.body.contents.forEach((content: any) => {
      expect(content.id).toBeDefined();
      expect(content.type).toMatch(/^(movie|series)$/);
      expect(content.title).toBeDefined();
      expect(content.poster_url).toBeDefined();
      expect(content.release_year).toBeGreaterThan(1900);
      expect(content.genres).toBeInstanceOf(Array);
      expect(content.rating).toBeGreaterThanOrEqual(0);
      expect(content.rating).toBeLessThanOrEqual(5);
    });
  });

  it('should filter by type (movie)', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie' });

    expect(response.status).toBe(200);
    response.body.contents.forEach((content: any) => {
      expect(content.type).toBe('movie');
      expect(content.duration).toBeGreaterThan(0);
    });
  });

  it('should filter by type (series)', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ type: 'series' });

    expect(response.status).toBe(200);
    response.body.contents.forEach((content: any) => {
      expect(content.type).toBe('series');
      expect(content.season_count).toBeGreaterThan(0);
    });
  });

  it('should filter by genre', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ type: 'all', genre: 'ファンタジー' });

    expect(response.status).toBe(200);
    response.body.contents.forEach((content: any) => {
      expect(content.genres).toContain('ファンタジー');
    });
  });

  it('should filter by country', async () => {
    const response = await request(app)
      .get('/api/netflix')
      .query({ country: 'JP' });

    expect(response.status).toBe(200);
    response.body.contents.forEach((content: any) => {
      expect(content.country).toBe('JP');
    });
  });
});
```

---

### 3.2 Netflix詳細取得API

#### TC-102: GET /api/netflix/:id（正常系）

```typescript
describe('GET /api/netflix/:id', () => {
  let userToken: string;
  let movieId: string;
  let seriesId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    // Premium プランにアップグレード
    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'premium' });

    // テスト用映画・シリーズID取得
    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'all', limit: 10 });

    movieId = netflixRes.body.contents.find((c: any) => c.type === 'movie')?.id;
    seriesId = netflixRes.body.contents.find((c: any) => c.type === 'series')?.id;
  });

  it('should retrieve movie details', async () => {
    const response = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(movieId);
    expect(response.body.type).toBe('movie');
    expect(response.body.title).toBeDefined();
    expect(response.body.description).toBeDefined();
    expect(response.body.poster_url).toBeDefined();
    expect(response.body.backdrop_url).toBeDefined();
    expect(response.body.release_year).toBeGreaterThan(1900);
    expect(response.body.country).toBeDefined();
    expect(response.body.genres).toBeInstanceOf(Array);
    expect(response.body.duration).toBeGreaterThan(0);
    expect(response.body.video_url).toBeDefined();
    expect(response.body.ip_license).toBeDefined();
    expect(response.body.view_count).toBeGreaterThanOrEqual(0);
    expect(response.body.like_count).toBeGreaterThanOrEqual(0);
  });

  it('should retrieve series details with seasons and episodes', async () => {
    const response = await request(app)
      .get(`/api/netflix/${seriesId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(seriesId);
    expect(response.body.type).toBe('series');
    expect(response.body.seasons).toBeInstanceOf(Array);
    expect(response.body.seasons.length).toBeGreaterThan(0);

    const firstSeason = response.body.seasons[0];
    expect(firstSeason.season_number).toBeGreaterThan(0);
    expect(firstSeason.title).toBeDefined();
    expect(firstSeason.episode_count).toBeGreaterThan(0);
    expect(firstSeason.episodes).toBeInstanceOf(Array);

    const firstEpisode = firstSeason.episodes[0];
    expect(firstEpisode.episode_id).toBeDefined();
    expect(firstEpisode.episode_number).toBeGreaterThan(0);
    expect(firstEpisode.title).toBeDefined();
    expect(firstEpisode.duration).toBeGreaterThan(0);
    expect(firstEpisode.video_url).toBeDefined();
    expect(firstEpisode.thumbnail_url).toBeDefined();
  });

  it('should require Premium plan', async () => {
    const freeUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${freeUserRes.body.access_token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('premium_required');
  });

  it('should return 404 for non-existent content', async () => {
    const response = await request(app)
      .get('/api/netflix/nc_nonexistent')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(404);
  });
});
```

---

### 3.3 映画作成API

#### TC-103: POST /api/netflix/content（正常系）

```typescript
describe('POST /api/netflix/content', () => {
  let creatorToken: string;
  let ipLicenseId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ plan: 'premium' });

    const ipRes = await request(app)
      .get('/api/ip-licenses')
      .set('Authorization', `Bearer ${creatorToken}`);

    ipLicenseId = ipRes.body.find((ip: any) => ip.license_type === '商用利用可')?.id;
  });

  it('should create movie successfully', async () => {
    const response = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'movie',
        title: 'サイバーパンク：ネオン都市',
        description: '近未来のメガシティを舞台に...',
        genres: ['SF', 'アクション', 'スリラー'],
        country: 'JP',
        release_year: 2024,
        rating: 4.5,
        duration: 135,
        is_adult: false,
        privacy: 'public',
        ip_license_id: ipLicenseId,
        poster_url: 'https://cdn.example.com/posters/temp_xxx.jpg',
        backdrop_url: 'https://cdn.example.com/backdrops/temp_xxx.jpg',
        video_file_id: 'mf_xxx'
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.title).toBe('サイバーパンク：ネオン都市');
    expect(response.body.type).toBe('movie');
    expect(response.body.status).toBe('processing');
    expect(response.body.created_at).toBeDefined();
  });

  it('should require creator permission', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${userRes.body.access_token}`)
      .send({
        type: 'movie',
        title: 'テスト映画'
      });

    expect(response.status).toBe(403);
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'movie'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
  });
});
```

---

### 3.4 シーズン作成API

#### TC-104: POST /api/netflix/:id/seasons（正常系）

```typescript
describe('POST /api/netflix/:id/seasons', () => {
  let creatorToken: string;
  let seriesId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);

    const seriesRes = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'series',
        title: 'テストシリーズ',
        genres: ['ドラマ'],
        country: 'JP',
        release_year: 2024
      });

    seriesId = seriesRes.body.id;
  });

  it('should create season successfully', async () => {
    const response = await request(app)
      .post(`/api/netflix/${seriesId}/seasons`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        season_number: 1,
        title: 'シーズン1',
        description: '物語の始まり',
        release_year: 2024
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.season_number).toBe(1);
    expect(response.body.title).toBe('シーズン1');
    expect(response.body.netflix_content_id).toBe(seriesId);
  });

  it('should reject duplicate season number', async () => {
    await request(app)
      .post(`/api/netflix/${seriesId}/seasons`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ season_number: 1, title: 'シーズン1' });

    const response = await request(app)
      .post(`/api/netflix/${seriesId}/seasons`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ season_number: 1, title: 'シーズン1' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('season_already_exists');
  });
});
```

---

### 3.5 エピソード作成API

#### TC-105: POST /api/netflix/:season_id/episodes（正常系）

```typescript
describe('POST /api/netflix/:season_id/episodes', () => {
  let creatorToken: string;
  let seasonId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    const seriesRes = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'series',
        title: 'テストシリーズ',
        genres: ['ドラマ']
      });

    const seasonRes = await request(app)
      .post(`/api/netflix/${seriesRes.body.id}/seasons`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ season_number: 1, title: 'シーズン1' });

    seasonId = seasonRes.body.id;
  });

  it('should create episode successfully', async () => {
    const response = await request(app)
      .post(`/api/netflix/${seasonId}/episodes`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        episode_number: 1,
        title: '始まりの地',
        description: '平和な村で育った少年が...',
        duration: 45,
        video_file_id: 'mf_ep001',
        thumbnail_url: 'https://cdn.example.com/temp_ep001.jpg'
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.episode_number).toBe(1);
    expect(response.body.title).toBe('始まりの地');
    expect(response.body.duration).toBe(45);
    expect(response.body.season_id).toBe(seasonId);
    expect(response.body.video_url).toBeDefined();
  });

  it('should reject duplicate episode number', async () => {
    await request(app)
      .post(`/api/netflix/${seasonId}/episodes`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        episode_number: 1,
        title: 'エピソード1',
        duration: 45,
        video_file_id: 'mf_ep001'
      });

    const response = await request(app)
      .post(`/api/netflix/${seasonId}/episodes`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        episode_number: 1,
        title: 'エピソード1',
        duration: 45,
        video_file_id: 'mf_ep002'
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('episode_already_exists');
  });
});
```

---

### 3.6 ストリーミングURL取得API

#### TC-106: GET /api/netflix/:id/stream（正常系）

```typescript
describe('GET /api/netflix/:id/stream', () => {
  let userToken: string;
  let movieId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'premium' });

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    movieId = netflixRes.body.contents[0].id;
  });

  it('should retrieve signed streaming URLs', async () => {
    const response = await request(app)
      .get(`/api/netflix/${movieId}/stream`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.content_id).toBe(movieId);
    expect(response.body.streams).toBeInstanceOf(Array);
    expect(response.body.streams.length).toBeGreaterThan(0);
    expect(response.body.expires_in).toBe(86400);

    response.body.streams.forEach((stream: any) => {
      expect(stream.quality).toMatch(/^(1080p|720p|480p)$/);
      expect(stream.url).toContain('signature=');
      expect(stream.bitrate).toBeGreaterThan(0);
    });
  });

  it('should require Premium plan', async () => {
    const freeUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .get(`/api/netflix/${movieId}/stream`)
      .set('Authorization', `Bearer ${freeUserRes.body.access_token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('premium_required');
  });
});
```

---

### 3.7 視聴記録API

#### TC-107: POST /api/netflix/:id/view（正常系）

```typescript
describe('POST /api/netflix/:id/view', () => {
  let userToken: string;
  let movieId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'premium' });

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    movieId = netflixRes.body.contents[0].id;
  });

  it('should record view successfully', async () => {
    const response = await request(app)
      .post(`/api/netflix/${movieId}/view`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('視聴を記録しました');
  });

  it('should increment view count', async () => {
    const beforeRes = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${userToken}`);

    const beforeViewCount = beforeRes.body.view_count;

    await request(app)
      .post(`/api/netflix/${movieId}/view`)
      .set('Authorization', `Bearer ${userToken}`);

    const afterRes = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(afterRes.body.view_count).toBe(beforeViewCount + 1);
  });
});
```

---

### 3.8 進捗保存API

#### TC-108: POST /api/netflix/:id/progress（正常系）

```typescript
describe('POST /api/netflix/:id/progress', () => {
  let userToken: string;
  let movieId: string;
  let episodeId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'premium' });

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'all', limit: 10 });

    movieId = netflixRes.body.contents.find((c: any) => c.type === 'movie')?.id;
    const series = netflixRes.body.contents.find((c: any) => c.type === 'series');

    if (series) {
      const seriesRes = await request(app)
        .get(`/api/netflix/${series.id}`)
        .set('Authorization', `Bearer ${userToken}`);
      episodeId = seriesRes.body.seasons[0]?.episodes[0]?.episode_id;
    }
  });

  it('should save movie watch progress', async () => {
    const response = await request(app)
      .post(`/api/netflix/${movieId}/progress`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        progress_seconds: 1800,
        duration_seconds: 8100
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('進捗を保存しました');
  });

  it('should save episode watch progress', async () => {
    if (!episodeId) return;

    const response = await request(app)
      .post(`/api/netflix/${movieId}/progress`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        episode_id: episodeId,
        progress_seconds: 1200,
        duration_seconds: 2700
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('進捗を保存しました');
  });
});
```

---

## 4. E2Eテスト

### 4.1 映画視聴フロー

#### TC-201: 映画視聴完全フロー

```typescript
import { test, expect } from '@playwright/test';

test.describe('Netflix Movie E2E - Playback Flow', () => {
  test('should complete movie search to playback flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'premium@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/netflix');
    await expect(page.locator('h1')).toContainText('Netflix');

    await page.click('select[name="type"]');
    await page.selectOption('select[name="type"]', 'movie');

    await expect(page.locator('.netflix-card')).toHaveCount.greaterThan(0);

    await page.click('.netflix-card:first-child');

    await expect(page.locator('.netflix-detail')).toBeVisible();
    await expect(page.locator('h1')).toBeDefined();
    await expect(page.locator('.poster-image')).toBeVisible();
    await expect(page.locator('.backdrop-image')).toBeVisible();

    await page.click('button:has-text("再生")');

    await expect(page.locator('video')).toBeVisible();

    await page.waitForTimeout(5000);

    const videoElement = await page.locator('video');
    const currentTime = await videoElement.evaluate((el: any) => el.currentTime);
    expect(currentTime).toBeGreaterThan(0);
  });
});
```

---

### 4.2 シリーズ視聴フロー

#### TC-202: シリーズ視聴完全フロー

```typescript
test.describe('Netflix Series E2E - Episode Playback Flow', () => {
  test('should complete series episode playback flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'premium@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/netflix');

    await page.click('select[name="type"]');
    await page.selectOption('select[name="type"]', 'series');

    await page.click('.netflix-card:first-child');

    await expect(page.locator('.seasons-list')).toBeVisible();

    await page.click('button:has-text("シーズン1")');

    await expect(page.locator('.episodes-list')).toBeVisible();
    await expect(page.locator('.episode-card')).toHaveCount.greaterThan(0);

    await page.click('.episode-card:first-child');

    await expect(page.locator('video')).toBeVisible();

    await page.waitForTimeout(5000);

    await page.click('button:has-text("次のエピソード")');

    await expect(page.locator('video')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証・プラン制限テスト

#### TC-301: Netflix API認証・プラン確認

```typescript
describe('Netflix Security - Authentication and Plan', () => {
  it('should require authentication for content details', async () => {
    const response = await request(app)
      .get('/api/netflix/nc_123456');

    expect(response.status).toBe(401);
  });

  it('should require Premium plan for Netflix content', async () => {
    const freeUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'TestPass123!' });

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    const movieId = netflixRes.body.contents[0].id;

    const response = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${freeUserRes.body.access_token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('premium_required');
  });

  it('should require Premium+ for adult content', async () => {
    const premiumRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${premiumRes.body.access_token}`)
      .send({ plan: 'premium' });

    const adultNetflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'all' });

    const adultContent = adultNetflixRes.body.contents.find((c: any) => c.is_adult);

    if (adultContent) {
      const response = await request(app)
        .get(`/api/netflix/${adultContent.id}`)
        .set('Authorization', `Bearer ${premiumRes.body.access_token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('premium_plus_required');
    }
  });
});
```

---

### 5.2 IP権利検証テスト

#### TC-302: IP権利管理

```typescript
describe('Netflix Security - IP License Validation', () => {
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

  it('should reject non-commercial IP license for Netflix', async () => {
    const ipRes = await request(app)
      .get('/api/ip-licenses')
      .set('Authorization', `Bearer ${creatorToken}`);

    const nonCommercialIP = ipRes.body.find((ip: any) => ip.license_type === '非商用のみ');

    if (nonCommercialIP) {
      const response = await request(app)
        .post('/api/netflix/content')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          type: 'movie',
          title: 'テスト映画',
          genres: ['ドラマ'],
          ip_license_id: nonCommercialIP.id
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('commercial_license_required');
    }
  });

  it('should reject inactive IP license', async () => {
    const response = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'movie',
        title: 'テスト映画',
        genres: ['ドラマ'],
        ip_license_id: 'ip_inactive'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_ip_license');
  });
});
```

---

### 5.3 署名付きURL検証テスト

#### TC-303: ストリーミングURL署名

```typescript
describe('Netflix Security - Signed URL', () => {
  let userToken: string;
  let movieId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'premium' });

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    movieId = netflixRes.body.contents[0].id;
  });

  it('should generate signed URL with expiration', async () => {
    const response = await request(app)
      .get(`/api/netflix/${movieId}/stream`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.streams[0].url).toContain('signature=');
    expect(response.body.expires_in).toBe(86400);
  });

  it('should reject expired signed URL', async () => {
    // URLの有効期限が切れた後のテスト（実際の実装ではモック時間を使用）
    const streamRes = await request(app)
      .get(`/api/netflix/${movieId}/stream`)
      .set('Authorization', `Bearer ${userToken}`);

    const expiredUrl = streamRes.body.streams[0].url;

    // 25時間後にアクセス（モック時間を使用）
    const response = await request(app)
      .get(expiredUrl);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('url_expired');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 Netflix一覧取得パフォーマンス

#### TC-401: 一覧取得（< 300ms）

```typescript
describe('Netflix Performance - List Retrieval', () => {
  it('should respond within 300ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/netflix')
        .query({ type: 'all', limit: 20 });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(300);
  });
});
```

#### TC-402: 詳細取得（< 200ms）

```typescript
describe('Netflix Performance - Detail Retrieval', () => {
  let userToken: string;
  let movieId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    movieId = netflixRes.body.contents[0].id;
  });

  it('should respond within 200ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get(`/api/netflix/${movieId}`)
        .set('Authorization', `Bearer ${userToken}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(200);
  });
});
```

#### TC-403: ストリーミングURL取得（< 500ms）

```typescript
describe('Netflix Performance - Streaming URL', () => {
  let userToken: string;
  let movieId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    movieId = netflixRes.body.contents[0].id;
  });

  it('should respond within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get(`/api/netflix/${movieId}/stream`)
        .set('Authorization', `Bearer ${userToken}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });
});
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const netflixTestData = {
  validMovie: {
    type: 'movie',
    title: 'サイバーパンク：ネオン都市',
    description: '近未来のメガシティを舞台に...',
    genres: ['SF', 'アクション', 'スリラー'],
    country: 'JP',
    release_year: 2024,
    rating: 4.5,
    duration: 135,
    is_adult: false,
    privacy: 'public'
  },
  validSeries: {
    type: 'series',
    title: 'ダークファンタジー：失われた王国',
    description: '古代の王国を舞台に...',
    genres: ['ファンタジー', 'アドベンチャー', 'アクション'],
    country: 'JP',
    release_year: 2023,
    rating: 4.8,
    is_adult: false,
    privacy: 'public'
  },
  validSeason: {
    season_number: 1,
    title: 'シーズン1',
    description: '物語の始まり',
    release_year: 2023
  },
  validEpisode: {
    episode_number: 1,
    title: '始まりの地',
    description: '平和な村で育った少年が...',
    duration: 45
  }
};

export const mockIPLicense = {
  id: 'ip_001',
  name: 'ファンタジーワールドキャラクター',
  thumbnail_url: 'https://cdn.example.com/ip/ip_001.jpg',
  license_type: '商用利用可',
  description: 'ファンタジー世界のキャラクター IP'
};
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（IP権利検証、プラン確認、エピソードソート）
- 統合テスト: 主要API 100%（全8エンドポイント）
- E2Eテスト: クリティカルパス 100%（映画視聴、シリーズ視聴）
- セキュリティテスト: プラン確認、IP権利検証、署名付きURL 100%
- パフォーマンステスト: 一覧 < 300ms、詳細 < 200ms、ストリーミングURL < 500ms

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
npm run test:unit:netflix

# 統合テスト
npm run test:integration:netflix

# E2Eテスト
npm run test:e2e:netflix

# パフォーマンステスト
k6 run tests/performance/netflix.js

# 全テスト実行
npm run test:netflix
```

### 9.3 CI/CD統合
- GitHub Actions でPR時に自動実行
- テストカバレッジレポート生成
- パフォーマンステスト結果のトレンド監視

---

## 10. 既知の課題・制約

- シリーズの途中シーズン削除の扱い
- IP権利削除時の既存コンテンツ影響
- 複数シーズンの並列トランスコード時の負荷
- DRMライセンス管理（Netflix独自コンテンツの場合）
- 大量エピソードの一括アップロード処理
