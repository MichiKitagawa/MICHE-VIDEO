# 動画管理機能テスト仕様書

**参照元**: `docs/specs/features/04-video-management.md`

---

## 1. 概要

### 1.1 テストの目的
動画のCRUD操作、メタデータ管理、公開設定、タグ管理の正確性を保証する。

### 1.2 テスト範囲
- 動画作成・更新・削除
- メタデータ編集（タイトル、説明、カテゴリ、タグ）
- サムネイル画像アップロード
- プライバシー設定（公開/限定公開/非公開）
- アダルトコンテンツフラグ
- 一括操作（削除、プライバシー変更）

---

## 2. ユニットテスト

### 2.1 バリデーションテスト

#### TC-001: タイトルバリデーション

```typescript
import { validateVideoTitle } from '@/lib/validation';

describe('Video Title Validation', () => {
  it('should accept valid titles', () => {
    expect(validateVideoTitle('素晴らしい動画タイトル')).toBe(true);
    expect(validateVideoTitle('A Great Video Title')).toBe(true);
  });

  it('should reject title shorter than 1 character', () => {
    expect(validateVideoTitle('')).toBe(false);
  });

  it('should reject title longer than 200 characters', () => {
    const longTitle = 'あ'.repeat(201);
    expect(validateVideoTitle(longTitle)).toBe(false);
  });
});
```

---

## 3. 統合テスト

### 3.1 動画作成API

#### TC-101: 動画作成（正常系）

**エンドポイント**: `POST /api/videos/create`

```typescript
describe('POST /api/videos/create', () => {
  it('should create video successfully', async () => {
    const response = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '素晴らしい動画',
        description: '詳細説明',
        category: 'education',
        tags: ['プログラミング', 'TypeScript'],
        privacy: 'public',
        is_adult: false,
        media_file_id: 'mf_123'
      });

    expect(response.status).toBe(201);
    expect(response.body.video).toMatchObject({
      title: '素晴らしい動画',
      category: 'education',
      privacy: 'public',
      status: 'processing'
    });
    expect(response.body.video.id).toBeDefined();
  });
});
```

---

### 3.2 動画更新API

#### TC-111: 動画メタデータ更新（正常系）

**エンドポイント**: `PATCH /api/videos/:id`

```typescript
describe('PATCH /api/videos/:id', () => {
  it('should update video metadata', async () => {
    const response = await request(app)
      .patch('/api/videos/vid_123')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '更新されたタイトル',
        description: '更新された説明',
        category: 'entertainment'
      });

    expect(response.status).toBe(200);
    expect(response.body.video.title).toBe('更新されたタイトル');
    expect(response.body.video.category).toBe('entertainment');
  });

  it('should reject update by non-owner', async () => {
    const otherUserToken = await getAccessToken('other@example.com');

    const response = await request(app)
      .patch('/api/videos/vid_123')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ title: 'Unauthorized Update' });

    expect(response.status).toBe(403);
  });
});
```

---

## 4. E2Eテスト

### 4.1 動画編集フロー

#### TC-201: 動画編集画面での更新

```typescript
test.describe('Video Edit Flow', () => {
  test('should edit video metadata', async ({ page }) => {
    await page.goto('/creation/video/vid_123/edit');

    await page.fill('input[name="title"]', '新しいタイトル');
    await page.fill('textarea[name="description"]', '新しい説明');
    await page.selectOption('select[name="category"]', 'gaming');

    await page.click('button:has-text("保存")');

    await expect(page.locator('text=動画を更新しました')).toBeVisible();
  });
});
```

---

## 5. テストカバレッジ目標

- ユニットテスト: 85%以上
- 統合テスト: 全CRUD API 100%
- E2Eテスト: 作成・編集・削除フロー
