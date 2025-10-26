# ショート動画管理機能テスト仕様書

**参照元**: `docs/specs/features/06-short-management.md`

---

## 1. 概要

### 1.1 テストの目的
TikTok/Instagram Reels形式のショート動画アップロード、編集、削除、メタデータ管理機能の品質保証とパフォーマンス検証を実施する。

### 1.2 テスト範囲
- ショート動画作成・アップロード
- メタデータ編集（タイトル、説明、カテゴリ、タグ）
- サムネイル管理
- プライバシー設定
- 一括操作（削除、プライバシー変更）
- セキュリティ対策（認証、バリデーション）
- パフォーマンス基準（応答時間、同時アップロード）

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+
- Jest 29+、Supertest、Playwright
- FFmpeg（動画トランスコード）

### 1.4 依存関係
- データベース: `shorts`, `short_tags`, `short_categories`, `short_versions`, `media_files`
- 外部サービス: AWS S3、AWS MediaConvert、Sharp（画像処理）

---

## 2. ユニットテスト

### 2.1 動画時間バリデーションテスト

#### TC-001: 60秒以内のショート動画（正常系）

```typescript
import { validateShortDuration } from '@/lib/shorts/validators';

describe('Short Duration Validation', () => {
  it('should accept video duration of 30 seconds', () => {
    const result = validateShortDuration(30);
    expect(result.isValid).toBe(true);
  });

  it('should accept video duration of exactly 60 seconds', () => {
    const result = validateShortDuration(60);
    expect(result.isValid).toBe(true);
  });

  it('should reject video duration over 60 seconds', () => {
    const result = validateShortDuration(75);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('60秒以内');
  });

  it('should reject video duration of 0 seconds', () => {
    const result = validateShortDuration(0);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('最小');
  });

  it('should accept minimum duration of 1 second', () => {
    const result = validateShortDuration(1);
    expect(result.isValid).toBe(true);
  });
});
```

---

### 2.2 タグバリデーションテスト

#### TC-002: タグの正規化と重複排除

```typescript
import { normalizeTags } from '@/lib/shorts/tags';

describe('Tag Normalization', () => {
  it('should convert tags to lowercase', () => {
    const tags = ['Dance', 'MUSIC', 'TikTok'];
    const normalized = normalizeTags(tags);

    expect(normalized).toEqual(['dance', 'music', 'tiktok']);
  });

  it('should remove duplicate tags', () => {
    const tags = ['dance', 'Dance', 'DANCE'];
    const normalized = normalizeTags(tags);

    expect(normalized).toEqual(['dance']);
    expect(normalized.length).toBe(1);
  });

  it('should trim whitespace from tags', () => {
    const tags = ['  dance  ', 'music ', ' tiktok'];
    const normalized = normalizeTags(tags);

    expect(normalized).toEqual(['dance', 'music', 'tiktok']);
  });

  it('should reject empty tags', () => {
    const tags = ['dance', '', '  ', 'music'];
    const normalized = normalizeTags(tags);

    expect(normalized).toEqual(['dance', 'music']);
  });

  it('should limit to 30 tags', () => {
    const tags = Array(35).fill('tag').map((t, i) => `${t}${i}`);
    const normalized = normalizeTags(tags);

    expect(normalized.length).toBeLessThanOrEqual(30);
  });

  it('should reject tags exceeding 50 characters', () => {
    const longTag = 'a'.repeat(51);
    const tags = ['dance', longTag];
    const normalized = normalizeTags(tags);

    expect(normalized).not.toContain(longTag);
    expect(normalized).toContain('dance');
  });
});
```

---

### 2.3 アスペクト比チェックテスト

#### TC-003: 縦型動画判定

```typescript
import { checkAspectRatio } from '@/lib/shorts/video-processor';

describe('Aspect Ratio Check', () => {
  it('should accept 9:16 vertical video (recommended)', () => {
    const result = checkAspectRatio(1080, 1920);
    expect(result.isVertical).toBe(true);
    expect(result.ratio).toBe('9:16');
    expect(result.warning).toBeUndefined();
  });

  it('should accept 16:9 horizontal video with warning', () => {
    const result = checkAspectRatio(1920, 1080);
    expect(result.isVertical).toBe(false);
    expect(result.ratio).toBe('16:9');
    expect(result.warning).toContain('縦型');
  });

  it('should handle square video (1:1)', () => {
    const result = checkAspectRatio(1080, 1080);
    expect(result.ratio).toBe('1:1');
    expect(result.warning).toBeDefined();
  });

  it('should handle ultra-wide video', () => {
    const result = checkAspectRatio(2560, 1080);
    expect(result.warning).toBeDefined();
  });
});
```

---

## 3. 統合テスト

### 3.1 ショート動画作成API

#### TC-101: POST /api/shorts/create（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('POST /api/shorts/create', () => {
  it('should create short successfully', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '素晴らしいショート動画',
        description: '踊ってみた！',
        category: 'dance',
        tags: ['ダンス', '踊ってみた', 'TikTok'],
        privacy: 'public',
        is_adult: false,
        video_file: 'reference_to_uploaded_file'
      });

    expect(response.status).toBe(201);
    expect(response.body.short).toBeDefined();
    expect(response.body.short.id).toMatch(/^short_/);
    expect(response.body.short.title).toBe('素晴らしいショート動画');
    expect(response.body.short.status).toBe('processing');
    expect(response.body.upload_status.status).toBe('processing');
  });

  it('should reject short over 60 seconds', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Short',
        duration: 75,
        video_file: 'reference_to_uploaded_file'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('60秒');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .send({
        title: 'Test Short',
        video_file: 'reference_to_uploaded_file'
      });

    expect(response.status).toBe(401);
  });

  it('should require creator permissions', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${nonCreatorToken}`)
      .send({
        title: 'Test Short',
        video_file: 'reference_to_uploaded_file'
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('クリエイター権限');
  });

  it('should validate title length', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'a'.repeat(201),
        video_file: 'reference_to_uploaded_file'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('200文字');
  });

  it('should reject invalid category', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Short',
        category: 'invalid_category',
        video_file: 'reference_to_uploaded_file'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('カテゴリ');
  });
});
```

---

### 3.2 ショート一覧取得API

#### TC-102: GET /api/shorts/my-shorts（正常系）

```typescript
describe('GET /api/shorts/my-shorts', () => {
  it('should get user shorts with pagination', async () => {
    const response = await request(app)
      .get('/api/shorts/my-shorts?page=1&limit=20')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.shorts).toBeInstanceOf(Array);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);
  });

  it('should filter by privacy setting', async () => {
    const response = await request(app)
      .get('/api/shorts/my-shorts?privacy=public')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    response.body.shorts.forEach(short => {
      expect(short.privacy).toBe('public');
    });
  });

  it('should sort by view count descending', async () => {
    const response = await request(app)
      .get('/api/shorts/my-shorts?sort=view_count&order=desc')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const shorts = response.body.shorts;

    if (shorts.length > 1) {
      for (let i = 0; i < shorts.length - 1; i++) {
        expect(shorts[i].view_count).toBeGreaterThanOrEqual(shorts[i + 1].view_count);
      }
    }
  });

  it('should sort by created date descending', async () => {
    const response = await request(app)
      .get('/api/shorts/my-shorts?sort=created_at&order=desc')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const shorts = response.body.shorts;

    if (shorts.length > 1) {
      const first = new Date(shorts[0].created_at);
      const second = new Date(shorts[1].created_at);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/shorts/my-shorts');

    expect(response.status).toBe(401);
  });
});
```

---

### 3.3 ショート詳細取得API

#### TC-103: GET /api/shorts/:id（正常系）

```typescript
describe('GET /api/shorts/:id', () => {
  it('should get short details', async () => {
    const response = await request(app)
      .get('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('short_123456');
    expect(response.body.title).toBeDefined();
    expect(response.body.video_url).toMatch(/\.m3u8$/);
    expect(response.body.thumbnail_url).toBeDefined();
    expect(response.body.category).toBeDefined();
    expect(response.body.tags).toBeInstanceOf(Array);
    expect(response.body.duration).toBeGreaterThan(0);
    expect(response.body.duration).toBeLessThanOrEqual(60);
  });

  it('should return 404 for non-existent short', async () => {
    const response = await request(app)
      .get('/api/shorts/short_nonexistent')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it('should return 403 for private short without permission', async () => {
    const response = await request(app)
      .get('/api/shorts/short_private')
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(403);
  });

  it('should allow owner to view private short', async () => {
    const response = await request(app)
      .get('/api/shorts/short_private')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.privacy).toBe('private');
  });
});
```

---

### 3.4 ショート更新API

#### TC-104: PATCH /api/shorts/:id（正常系）

```typescript
describe('PATCH /api/shorts/:id', () => {
  it('should update short metadata', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '更新されたタイトル',
        description: '更新された説明文',
        category: 'comedy',
        tags: ['新しいタグ', '更新']
      });

    expect(response.status).toBe(200);
    expect(response.body.short.title).toBe('更新されたタイトル');
    expect(response.body.short.description).toBe('更新された説明文');
    expect(response.body.short.category).toBe('comedy');
    expect(response.body.short.tags).toContain('新しいタグ');
    expect(response.body.short.updated_at).toBeDefined();
  });

  it('should update privacy setting', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        privacy: 'unlisted'
      });

    expect(response.status).toBe(200);
    expect(response.body.short.privacy).toBe('unlisted');
  });

  it('should reject update by non-owner', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        title: 'Unauthorized Update'
      });

    expect(response.status).toBe(403);
  });

  it('should validate updated title length', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'a'.repeat(201)
      });

    expect(response.status).toBe(400);
  });

  it('should normalize and deduplicate tags', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tags: ['Dance', 'dance', 'DANCE', 'Music']
      });

    expect(response.status).toBe(200);
    expect(response.body.short.tags).toEqual(['dance', 'music']);
  });
});
```

---

### 3.5 ショート削除API

#### TC-105: DELETE /api/shorts/:id（正常系）

```typescript
describe('DELETE /api/shorts/:id', () => {
  it('should delete short successfully', async () => {
    const response = await request(app)
      .delete('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('ショート動画を削除しました');
    expect(response.body.short_id).toBe('short_123456');
  });

  it('should return 404 when deleting non-existent short', async () => {
    const response = await request(app)
      .delete('/api/shorts/short_nonexistent')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it('should reject deletion by non-owner', async () => {
    const response = await request(app)
      .delete('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(403);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete('/api/shorts/short_123456');

    expect(response.status).toBe(401);
  });

  it('should also delete related data (tags, views)', async () => {
    await request(app)
      .delete('/api/shorts/short_123456')
      .set('Authorization', `Bearer ${accessToken}`);

    const tagsResponse = await db.query(
      'SELECT * FROM short_tags WHERE short_id = $1',
      ['short_123456']
    );
    expect(tagsResponse.rows.length).toBe(0);
  });
});
```

---

### 3.6 サムネイル更新API

#### TC-106: PATCH /api/shorts/:id/thumbnail（正常系）

```typescript
describe('PATCH /api/shorts/:id/thumbnail', () => {
  it('should update thumbnail successfully', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_123456/thumbnail')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        thumbnail: 'base64_encoded_image_data'
      });

    expect(response.status).toBe(200);
    expect(response.body.short_id).toBe('short_123456');
    expect(response.body.thumbnail_url).toMatch(/^https:\/\/cdn/);
    expect(response.body.updated_at).toBeDefined();
  });

  it('should reject invalid base64 image', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_123456/thumbnail')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        thumbnail: 'invalid_base64_data'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('画像');
  });

  it('should reject thumbnail exceeding 5MB', async () => {
    const largeThumbnail = Buffer.alloc(6 * 1024 * 1024).toString('base64');

    const response = await request(app)
      .patch('/api/shorts/short_123456/thumbnail')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        thumbnail: largeThumbnail
      });

    expect(response.status).toBe(413);
  });

  it('should reject update by non-owner', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_123456/thumbnail')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        thumbnail: 'base64_encoded_image_data'
      });

    expect(response.status).toBe(403);
  });
});
```

---

### 3.7 カテゴリ一覧取得API

#### TC-107: GET /api/shorts/categories（正常系）

```typescript
describe('GET /api/shorts/categories', () => {
  it('should get all active categories', async () => {
    const response = await request(app)
      .get('/api/shorts/categories');

    expect(response.status).toBe(200);
    expect(response.body.categories).toBeInstanceOf(Array);
    expect(response.body.categories.length).toBeGreaterThan(0);
  });

  it('should include category metadata', async () => {
    const response = await request(app)
      .get('/api/shorts/categories');

    expect(response.status).toBe(200);
    const category = response.body.categories[0];

    expect(category.id).toBeDefined();
    expect(category.name).toBeDefined();
    expect(category.name_en).toBeDefined();
    expect(category.icon).toBeDefined();
  });

  it('should return sorted categories by sort_order', async () => {
    const response = await request(app)
      .get('/api/shorts/categories');

    expect(response.status).toBe(200);
    expect(response.body.categories[0].id).toBe('dance');
    expect(response.body.categories[1].id).toBe('comedy');
  });

  it('should not require authentication', async () => {
    const response = await request(app)
      .get('/api/shorts/categories');

    expect(response.status).toBe(200);
  });
});
```

---

### 3.8 タグサジェスト取得API

#### TC-108: GET /api/shorts/tags/suggest（正常系）

```typescript
describe('GET /api/shorts/tags/suggest', () => {
  it('should suggest tags based on query', async () => {
    const response = await request(app)
      .get('/api/shorts/tags/suggest?q=ダンス&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.suggestions).toBeInstanceOf(Array);
    expect(response.body.suggestions.length).toBeLessThanOrEqual(10);
  });

  it('should include tag count in suggestions', async () => {
    const response = await request(app)
      .get('/api/shorts/tags/suggest?q=ダンス')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    if (response.body.suggestions.length > 0) {
      const suggestion = response.body.suggestions[0];
      expect(suggestion.tag).toBeDefined();
      expect(suggestion.count).toBeGreaterThan(0);
    }
  });

  it('should return suggestions sorted by count descending', async () => {
    const response = await request(app)
      .get('/api/shorts/tags/suggest?q=ダンス')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const suggestions = response.body.suggestions;

    if (suggestions.length > 1) {
      expect(suggestions[0].count).toBeGreaterThanOrEqual(suggestions[1].count);
    }
  });

  it('should require minimum 2 characters query', async () => {
    const response = await request(app)
      .get('/api/shorts/tags/suggest?q=a')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('2文字');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/shorts/tags/suggest?q=ダンス');

    expect(response.status).toBe(401);
  });
});
```

---

### 3.9 一括削除API

#### TC-109: POST /api/shorts/bulk-delete（正常系）

```typescript
describe('POST /api/shorts/bulk-delete', () => {
  it('should delete multiple shorts', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        short_ids: ['short_123456', 'short_789012', 'short_345678']
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('3件');
    expect(response.body.deleted_count).toBe(3);
    expect(response.body.failed).toEqual([]);
  });

  it('should skip shorts not owned by user', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        short_ids: ['short_owned', 'short_not_owned']
      });

    expect(response.status).toBe(200);
    expect(response.body.deleted_count).toBe(1);
    expect(response.body.failed.length).toBe(1);
    expect(response.body.failed[0].short_id).toBe('short_not_owned');
    expect(response.body.failed[0].reason).toContain('権限');
  });

  it('should handle non-existent shorts', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        short_ids: ['short_123456', 'short_nonexistent']
      });

    expect(response.status).toBe(200);
    expect(response.body.failed.length).toBe(1);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-delete')
      .send({
        short_ids: ['short_123456']
      });

    expect(response.status).toBe(401);
  });

  it('should reject empty short_ids array', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        short_ids: []
      });

    expect(response.status).toBe(400);
  });
});
```

---

### 3.10 一括プライバシー変更API

#### TC-110: POST /api/shorts/bulk-update-privacy（正常系）

```typescript
describe('POST /api/shorts/bulk-update-privacy', () => {
  it('should update privacy for multiple shorts', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-update-privacy')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        short_ids: ['short_123456', 'short_789012'],
        privacy: 'unlisted'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('2件');
    expect(response.body.updated_count).toBe(2);
  });

  it('should validate privacy value', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-update-privacy')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        short_ids: ['short_123456'],
        privacy: 'invalid_privacy'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('privacy');
  });

  it('should only update owned shorts', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-update-privacy')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        short_ids: ['short_owned', 'short_not_owned'],
        privacy: 'private'
      });

    expect(response.status).toBe(200);
    expect(response.body.updated_count).toBe(1);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/shorts/bulk-update-privacy')
      .send({
        short_ids: ['short_123456'],
        privacy: 'public'
      });

    expect(response.status).toBe(401);
  });
});
```

---

## 4. E2Eテスト

### 4.1 ショート動画アップロード完全フロー

#### TC-201: ショート作成〜公開フロー

```typescript
import { test, expect } from '@playwright/test';

test.describe('Short Management E2E', () => {
  test('should create and publish short successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/creation');
    await expect(page).toHaveURL('/creation');

    await page.click('text=ショート動画をアップロード');

    await page.fill('input[name="title"]', '素晴らしいダンス動画');
    await page.fill('textarea[name="description"]', '踊ってみました！');

    await page.selectOption('select[name="category"]', 'dance');

    await page.fill('input[name="tags"]', 'ダンス,踊ってみた,TikTok');

    await page.click('input[value="public"]');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/short-video-30s.mp4');

    await page.click('button:has-text("アップロード")');

    await expect(page.locator('text=処理中')).toBeVisible();

    await expect(page.locator('text=公開済み')).toBeVisible({ timeout: 60000 });

    await page.goto('/creation');
    await page.click('text=Shorts');
    await expect(page.locator('text=素晴らしいダンス動画')).toBeVisible();
  });

  test('should edit short metadata', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/creation');
    await page.click('text=Shorts');

    await page.click('[data-testid="short-item"]:first-child button:has-text("編集")');

    await page.fill('input[name="title"]', '更新されたタイトル');

    await page.selectOption('select[name="category"]', 'comedy');

    await page.click('button:has-text("保存")');

    await expect(page.locator('text=更新しました')).toBeVisible();

    await page.goto('/creation');
    await page.click('text=Shorts');
    await expect(page.locator('text=更新されたタイトル')).toBeVisible();
  });

  test('should delete short with confirmation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/creation');
    await page.click('text=Shorts');

    const shortTitle = await page.locator('[data-testid="short-item"]:first-child h3').textContent();

    await page.click('[data-testid="short-item"]:first-child button:has-text("削除")');

    await expect(page.locator('text=本当に削除しますか')).toBeVisible();
    await page.click('button:has-text("削除する")');

    await expect(page.locator('text=削除しました')).toBeVisible();
    await expect(page.locator(`text=${shortTitle}`)).not.toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証・認可テスト

#### TC-301: 認証必須エンドポイントの保護

```typescript
describe('Short Management Security', () => {
  it('should require authentication for short creation', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .send({
        title: 'Test Short',
        video_file: 'reference'
      });

    expect(response.status).toBe(401);
  });

  it('should require creator permissions', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({
        title: 'Test Short',
        video_file: 'reference'
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('クリエイター');
  });

  it('should prevent editing others shorts', async () => {
    const response = await request(app)
      .patch('/api/shorts/short_other_user')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Unauthorized Edit'
      });

    expect(response.status).toBe(403);
  });

  it('should prevent deleting others shorts', async () => {
    const response = await request(app)
      .delete('/api/shorts/short_other_user')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

### 5.2 XSS対策テスト

#### TC-302: メタデータのサニタイズ

```typescript
describe('XSS Prevention', () => {
  it('should sanitize title content', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '<script>alert("XSS")</script>テストショート',
        video_file: 'reference'
      });

    expect(response.status).toBe(201);
    expect(response.body.short.title).not.toContain('<script>');
    expect(response.body.short.title).toContain('テストショート');
  });

  it('should sanitize description content', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Short',
        description: '<img src=x onerror="alert(1)">説明文',
        video_file: 'reference'
      });

    expect(response.status).toBe(201);
    expect(response.body.short.description).not.toContain('onerror');
    expect(response.body.short.description).toContain('説明文');
  });

  it('should sanitize tags', async () => {
    const response = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Short',
        tags: ['<script>alert(1)</script>', 'normalTag'],
        video_file: 'reference'
      });

    expect(response.status).toBe(201);
    response.body.short.tags.forEach(tag => {
      expect(tag).not.toContain('<script>');
    });
  });
});
```

---

### 5.3 レート制限テスト

#### TC-303: アップロードレート制限

```typescript
describe('Rate Limiting', () => {
  it('should limit daily short uploads', async () => {
    const uploadPromises = [];

    for (let i = 0; i < 101; i++) {
      uploadPromises.push(
        request(app)
          .post('/api/shorts/create')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: `Short ${i}`,
            video_file: `reference_${i}`
          })
      );
    }

    const responses = await Promise.all(uploadPromises);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].body.error).toContain('1日の投稿上限');
  });

  it('should limit concurrent uploads', async () => {
    const uploadPromises = [];

    for (let i = 0; i < 6; i++) {
      uploadPromises.push(
        request(app)
          .post('/api/shorts/create')
          .set('Authorization', `Bearer ${premiumPlusToken}`)
          .send({
            title: `Concurrent Short ${i}`,
            video_file: `reference_${i}`
          })
      );
    }

    const responses = await Promise.all(uploadPromises);
    const rejected = responses.filter(r => r.status === 429);

    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected[0].body.error).toContain('同時アップロード');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 応答時間テスト

#### TC-401: API応答時間（P95 < 500ms）

```typescript
describe('Short Management Performance', () => {
  it('should respond to short creation within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: `Performance Test Short ${i}`,
          video_file: `reference_${i}`
        });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });

  it('should load short list within 300ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
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

  it('should update short metadata within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .patch('/api/shorts/short_123456')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: `Updated Title ${i}`
        });
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

#### TC-402: 同時アップロードストレステスト

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    title: `Load Test Short ${__VU}_${__ITER}`,
    description: 'Load testing short creation',
    category: 'dance',
    tags: ['load', 'test'],
    privacy: 'public',
    video_file: `reference_${__VU}_${__ITER}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test_token',
    },
  };

  const res = http.post('http://localhost:3000/api/shorts/create', payload, params);

  check(res, {
    'short created': (r) => r.status === 201,
    'has short_id': (r) => JSON.parse(r.body).short.id !== undefined,
  });

  sleep(1);
}
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const testShorts = {
  published: {
    id: 'short_123456',
    user_id: 'usr_789',
    title: '素晴らしいショート動画',
    description: '踊ってみた！',
    category: 'dance',
    duration: 30,
    privacy: 'public',
    is_adult: false,
    view_count: 5678,
    like_count: 234,
  },

  private: {
    id: 'short_private',
    privacy: 'private',
    user_id: 'usr_789',
  },

  processing: {
    id: 'short_processing',
    status: 'processing',
    user_id: 'usr_789',
  },
};

export const testTags = {
  valid: ['ダンス', '踊ってみた', 'TikTok'],
  duplicate: ['dance', 'Dance', 'DANCE'],
  empty: ['', '  ', 'valid'],
  tooLong: ['a'.repeat(51)],
  tooMany: Array(35).fill('tag').map((t, i) => `${t}${i}`),
};

export const testCategories = [
  { id: 'dance', name: 'ダンス', name_en: 'Dance', icon: 'musical-notes' },
  { id: 'comedy', name: 'コメディ', name_en: 'Comedy', icon: 'happy' },
  { id: 'beauty', name: '美容', name_en: 'Beauty', icon: 'rose' },
];
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（バリデーション、正規化ロジック）
- 統合テスト: 主要API 100%（全10エンドポイント）
- E2Eテスト: クリティカルパス 100%（作成〜編集〜削除）
- セキュリティテスト: 認証、XSS、レート制限 100%
- パフォーマンステスト: P95応答時間、負荷テスト

---

## 9. 既知の課題・制約

- FFmpegトランスコードのテストは実際の動画ファイル必要
- 60秒超動画のバリデーションはファイルサイズによりタイムアウト可能
- 同時アップロード制限はPremium/Premium+プランで異なる
- アダルトコンテンツのAI検出は外部サービス依存
- タグの正規化は言語設定により動作が異なる場合あり
