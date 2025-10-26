# プレイリスト機能テスト仕様書

**参照元**: `docs/specs/features/11-playlist.md`

---

## 1. 概要

### 1.1 テストの目的
プレイリスト機能の品質保証とパフォーマンス検証を実施する。プレイリスト作成、動画追加・削除、並び替え、再生、公開設定管理について包括的なテストを行う。

### 1.2 テスト範囲
- プレイリスト作成API
- マイプレイリスト一覧取得API
- プレイリスト詳細取得API
- プレイリスト更新API
- プレイリスト削除API
- 動画追加・削除API
- 動画並び替えAPI
- プレイリスト公開設定API
- セキュリティ（認証、XSS、レート制限）
- パフォーマンス基準

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+
- Jest 29+、Supertest、Playwright

### 1.4 依存関係
- データベース: `playlists`, `playlist_videos`, `playlist_views`
- 関連機能: 動画管理、動画再生

---

## 2. ユニットテスト

### 2.1 プレイリスト名バリデーション

#### TC-001: プレイリスト名検証（正常系）

```typescript
import { validatePlaylistName } from '@/lib/playlist/validation';

describe('Playlist Name Validation', () => {
  it('should accept valid playlist name', () => {
    const result = validatePlaylistName('お気に入り動画');

    expect(result.isValid).toBe(true);
  });

  it('should accept minimum length (1 character)', () => {
    const result = validatePlaylistName('A');

    expect(result.isValid).toBe(true);
  });

  it('should accept maximum length (100 characters)', () => {
    const longName = 'a'.repeat(100);
    const result = validatePlaylistName(longName);

    expect(result.isValid).toBe(true);
  });

  it('should accept Unicode characters (Japanese)', () => {
    const result = validatePlaylistName('プログラミング学習リスト');

    expect(result.isValid).toBe(true);
  });
});
```

#### TC-002: プレイリスト名検証（異常系）

```typescript
describe('Playlist Name Validation - Error Cases', () => {
  it('should reject empty name', () => {
    const result = validatePlaylistName('');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('プレイリスト名は必須です');
  });

  it('should reject name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = validatePlaylistName(longName);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('100文字');
  });
});
```

---

### 2.2 動画上限チェック

#### TC-003: 動画上限検証（プラン別）

```typescript
import { checkVideoLimit } from '@/lib/playlist/limits';

describe('Playlist Video Limit', () => {
  it('should allow up to 50 videos for Free plan', () => {
    const result = checkVideoLimit('free', 50);

    expect(result.allowed).toBe(true);
  });

  it('should reject 51st video for Free plan', () => {
    const result = checkVideoLimit('free', 51);

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(50);
    expect(result.upgradePlan).toBe('premium');
  });

  it('should allow up to 200 videos for Premium plan', () => {
    const result = checkVideoLimit('premium', 200);

    expect(result.allowed).toBe(true);
  });

  it('should allow up to 500 videos for Premium+ plan', () => {
    const result = checkVideoLimit('premium_plus', 500);

    expect(result.allowed).toBe(true);
  });
});
```

---

### 2.3 並び替えアルゴリズム

#### TC-004: 動画並び替え処理

```typescript
import { reorderVideos } from '@/lib/playlist/reorder';

describe('Video Reordering Algorithm', () => {
  it('should reorder videos correctly', () => {
    const videoOrders = [
      { video_id: 'vid_123', position: 0 },
      { video_id: 'vid_456', position: 1 },
      { video_id: 'vid_789', position: 2 }
    ];

    const result = reorderVideos(videoOrders);

    expect(result).toEqual([
      { video_id: 'vid_123', position: 0 },
      { video_id: 'vid_456', position: 1 },
      { video_id: 'vid_789', position: 2 }
    ]);
  });

  it('should handle position gaps', () => {
    const videoOrders = [
      { video_id: 'vid_123', position: 0 },
      { video_id: 'vid_456', position: 5 },
      { video_id: 'vid_789', position: 10 }
    ];

    const result = reorderVideos(videoOrders);

    expect(result[0].position).toBe(0);
    expect(result[1].position).toBe(1);
    expect(result[2].position).toBe(2);
  });
});
```

---

## 3. 統合テスト

### 3.1 プレイリスト作成API

#### TC-101: POST /api/playlists/create（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('POST /api/playlists/create', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should create playlist successfully', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'お気に入り動画',
        description: '何度も見たい動画を集めました',
        is_public: true
      });

    expect(response.status).toBe(201);
    expect(response.body.playlist.id).toBeDefined();
    expect(response.body.playlist.name).toBe('お気に入り動画');
    expect(response.body.playlist.description).toBe('何度も見たい動画を集めました');
    expect(response.body.playlist.is_public).toBe(true);
    expect(response.body.playlist.video_count).toBe(0);
    expect(response.body.playlist.created_at).toBeDefined();
  });

  it('should create playlist without description', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'シンプルプレイリスト',
        is_public: false
      });

    expect(response.status).toBe(201);
    expect(response.body.playlist.description).toBeUndefined();
  });

  it('should reject playlist without name', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        description: '説明のみ',
        is_public: true
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('name_required');
  });

  it('should reject playlist with name exceeding 100 characters', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'a'.repeat(101),
        is_public: true
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('name_too_long');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .send({
        name: 'プレイリスト',
        is_public: true
      });

    expect(response.status).toBe(401);
  });
});
```

---

### 3.2 マイプレイリスト一覧取得API

#### TC-102: GET /api/playlists/my-playlists（正常系）

```typescript
describe('GET /api/playlists/my-playlists', () => {
  it('should retrieve user playlists with pagination', async () => {
    const response = await request(app)
      .get('/api/playlists/my-playlists')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.playlists).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);

    response.body.playlists.forEach((playlist: any) => {
      expect(playlist.id).toBeDefined();
      expect(playlist.name).toBeDefined();
      expect(playlist.video_count).toBeGreaterThanOrEqual(0);
      expect(playlist.is_public).toBeDefined();
      expect(playlist.created_at).toBeDefined();
    });
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/playlists/my-playlists');

    expect(response.status).toBe(401);
  });
});
```

---

### 3.3 プレイリスト詳細取得API

#### TC-103: GET /api/playlists/:id（正常系）

```typescript
describe('GET /api/playlists/:id', () => {
  let playlistId: string;

  beforeEach(async () => {
    const createRes = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'テストプレイリスト',
        description: 'テスト用',
        is_public: true
      });
    playlistId = createRes.body.playlist.id;
  });

  it('should retrieve public playlist details', async () => {
    const response = await request(app)
      .get(`/api/playlists/${playlistId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(playlistId);
    expect(response.body.name).toBe('テストプレイリスト');
    expect(response.body.description).toBe('テスト用');
    expect(response.body.is_public).toBe(true);
    expect(response.body.video_count).toBeGreaterThanOrEqual(0);
    expect(response.body.user_id).toBeDefined();
    expect(response.body.user_name).toBeDefined();
    expect(response.body.videos).toBeInstanceOf(Array);
  });

  it('should reject access to private playlist by others', async () => {
    // 非公開プレイリスト作成
    const privateRes = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: '非公開プレイリスト',
        is_public: false
      });
    const privatePlaylistId = privateRes.body.playlist.id;

    // 他のユーザーでアクセス試行
    const otherUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });
    const otherUserToken = otherUserRes.body.access_token;

    const response = await request(app)
      .get(`/api/playlists/${privatePlaylistId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(403);
  });

  it('should return 404 for non-existent playlist', async () => {
    const response = await request(app)
      .get('/api/playlists/pl_nonexistent');

    expect(response.status).toBe(404);
  });
});
```

---

### 3.4 プレイリストに動画追加API

#### TC-104: POST /api/playlists/:id/videos/add（正常系）

```typescript
describe('POST /api/playlists/:id/videos/add', () => {
  let playlistId: string;
  let videoId: string;

  beforeEach(async () => {
    const playlistRes = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'テストプレイリスト',
        is_public: true
      });
    playlistId = playlistRes.body.playlist.id;

    // テスト用動画作成
    const videoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'テスト動画' });
    videoId = videoRes.body.video.id;
  });

  it('should add video to playlist successfully', async () => {
    const response = await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: videoId });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('プレイリストに動画を追加しました');
    expect(response.body.playlist_id).toBe(playlistId);
    expect(response.body.video_id).toBe(videoId);
    expect(response.body.position).toBe(0);
    expect(response.body.video_count).toBe(1);
  });

  it('should reject duplicate video addition', async () => {
    // 1回目の追加
    await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: videoId });

    // 2回目の追加（重複）
    const response = await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: videoId });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('video_already_in_playlist');
  });

  it('should reject when exceeding video limit', async () => {
    // Free プランで50本制限を想定
    for (let i = 0; i < 50; i++) {
      const vid = await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: `動画${i}` });

      await request(app)
        .post(`/api/playlists/${playlistId}/videos/add`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ video_id: vid.body.video.id });
    }

    const extraVideoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '51本目' });

    const response = await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: extraVideoRes.body.video.id });

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('playlist_video_limit_exceeded');
    expect(response.body.details.limit).toBe(50);
  });

  it('should require playlist ownership', async () => {
    const otherUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });
    const otherUserToken = otherUserRes.body.access_token;

    const response = await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ video_id: videoId });

    expect(response.status).toBe(403);
  });
});
```

---

### 3.5 プレイリストから動画削除API

#### TC-105: DELETE /api/playlists/:id/videos/:video_id（正常系）

```typescript
describe('DELETE /api/playlists/:id/videos/:video_id', () => {
  let playlistId: string;
  let videoId: string;

  beforeEach(async () => {
    const playlistRes = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'テストプレイリスト', is_public: true });
    playlistId = playlistRes.body.playlist.id;

    const videoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'テスト動画' });
    videoId = videoRes.body.video.id;

    await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: videoId });
  });

  it('should remove video from playlist successfully', async () => {
    const response = await request(app)
      .delete(`/api/playlists/${playlistId}/videos/${videoId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('プレイリストから動画を削除しました');
    expect(response.body.playlist_id).toBe(playlistId);
    expect(response.body.video_id).toBe(videoId);
    expect(response.body.video_count).toBe(0);
  });

  it('should return 404 for video not in playlist', async () => {
    const otherVideoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '別の動画' });

    const response = await request(app)
      .delete(`/api/playlists/${playlistId}/videos/${otherVideoRes.body.video.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(404);
  });
});
```

---

### 3.6 動画並び替えAPI

#### TC-106: POST /api/playlists/:id/videos/reorder（正常系）

```typescript
describe('POST /api/playlists/:id/videos/reorder', () => {
  let playlistId: string;
  let video1Id: string;
  let video2Id: string;
  let video3Id: string;

  beforeEach(async () => {
    const playlistRes = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'テストプレイリスト', is_public: true });
    playlistId = playlistRes.body.playlist.id;

    // 3本の動画を追加
    const v1 = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '動画1' });
    video1Id = v1.body.video.id;

    const v2 = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '動画2' });
    video2Id = v2.body.video.id;

    const v3 = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '動画3' });
    video3Id = v3.body.video.id;

    await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: video1Id });

    await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: video2Id });

    await request(app)
      .post(`/api/playlists/${playlistId}/videos/add`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ video_id: video3Id });
  });

  it('should reorder videos successfully', async () => {
    const response = await request(app)
      .post(`/api/playlists/${playlistId}/videos/reorder`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        video_orders: [
          { video_id: video3Id, position: 0 },
          { video_id: video1Id, position: 1 },
          { video_id: video2Id, position: 2 }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('動画の並び順を更新しました');
    expect(response.body.playlist_id).toBe(playlistId);
    expect(response.body.updated_count).toBe(3);
  });

  it('should require playlist ownership', async () => {
    const otherUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .post(`/api/playlists/${playlistId}/videos/reorder`)
      .set('Authorization', `Bearer ${otherUserRes.body.access_token}`)
      .send({
        video_orders: [
          { video_id: video1Id, position: 0 }
        ]
      });

    expect(response.status).toBe(403);
  });
});
```

---

### 3.7 プレイリスト更新API

#### TC-107: PATCH /api/playlists/:id（正常系）

```typescript
describe('PATCH /api/playlists/:id', () => {
  let playlistId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: '元のプレイリスト名',
        description: '元の説明',
        is_public: true
      });
    playlistId = res.body.playlist.id;
  });

  it('should update playlist successfully', async () => {
    const response = await request(app)
      .patch(`/api/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: '更新されたプレイリスト名',
        description: '更新された説明',
        is_public: false
      });

    expect(response.status).toBe(200);
    expect(response.body.playlist.id).toBe(playlistId);
    expect(response.body.playlist.name).toBe('更新されたプレイリスト名');
    expect(response.body.playlist.description).toBe('更新された説明');
    expect(response.body.playlist.is_public).toBe(false);
    expect(response.body.playlist.updated_at).toBeDefined();
  });

  it('should update only specified fields', async () => {
    const response = await request(app)
      .patch(`/api/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: '名前のみ更新'
      });

    expect(response.status).toBe(200);
    expect(response.body.playlist.name).toBe('名前のみ更新');
  });
});
```

---

### 3.8 プレイリスト削除API

#### TC-108: DELETE /api/playlists/:id（正常系）

```typescript
describe('DELETE /api/playlists/:id', () => {
  let playlistId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: '削除予定プレイリスト', is_public: true });
    playlistId = res.body.playlist.id;
  });

  it('should delete playlist successfully', async () => {
    const response = await request(app)
      .delete(`/api/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('プレイリストを削除しました');
    expect(response.body.playlist_id).toBe(playlistId);
  });

  it('should return 404 after deletion', async () => {
    await request(app)
      .delete(`/api/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`);

    const response = await request(app)
      .get(`/api/playlists/${playlistId}`);

    expect(response.status).toBe(404);
  });

  it('should require playlist ownership', async () => {
    const otherUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .delete(`/api/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${otherUserRes.body.access_token}`);

    expect(response.status).toBe(403);
  });
});
```

---

## 4. E2Eテスト

### 4.1 プレイリスト作成から再生まで

#### TC-201: プレイリスト完全フロー

```typescript
import { test, expect } from '@playwright/test';

test.describe('Playlist E2E - Full Flow', () => {
  test('should complete full playlist creation and playback flow', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 設定画面のマイプレイリストタブに移動
    await page.goto('/(tabs)/settings');
    await page.click('text=マイプレイリスト');

    // プレイリスト作成ボタンクリック
    await page.click('button:has-text("新規プレイリスト作成")');

    // プレイリスト情報入力
    await expect(page.locator('dialog')).toBeVisible();
    await page.fill('input[name="name"]', 'E2Eテストプレイリスト');
    await page.fill('textarea[name="description"]', 'テスト用のプレイリストです');
    await page.click('input[name="is_public"]');

    // 作成ボタンクリック
    await page.click('button:has-text("作成")');

    // 成功メッセージ確認
    await expect(page.locator('text=プレイリストを作成しました')).toBeVisible();

    // プレイリスト一覧に表示されることを確認
    await expect(page.locator('text=E2Eテストプレイリスト')).toBeVisible();

    // 動画ページに移動
    await page.goto('/(tabs)/videos');
    await page.click('.video-card:first-child');

    // 保存ボタンクリック
    await page.click('button:has-text("保存")');

    // プレイリスト選択モーダル表示
    await expect(page.locator('text=プレイリストに保存')).toBeVisible();
    await page.click('text=E2Eテストプレイリスト');

    // 成功メッセージ確認
    await expect(page.locator('text=プレイリストに追加しました')).toBeVisible();

    // プレイリスト詳細ページに移動
    await page.goto('/(tabs)/settings');
    await page.click('text=マイプレイリスト');
    await page.click('text=E2Eテストプレイリスト');

    // 動画が表示されることを確認
    await expect(page.locator('.playlist-video-item')).toHaveCount(1);

    // 再生ボタンクリック
    await page.click('button:has-text("再生")');

    // 動画プレイヤーが表示されることを確認
    await expect(page.locator('video')).toBeVisible();
  });
});
```

---

### 4.2 プレイリスト編集フロー

#### TC-202: プレイリスト編集・動画並び替え

```typescript
test.describe('Playlist E2E - Edit Flow', () => {
  test('should edit playlist and reorder videos', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // プレイリスト詳細ページに移動
    await page.goto('/playlist/pl_123456');

    // 編集ボタンクリック
    await page.click('button:has-text("編集")');

    // プレイリスト情報編集
    await page.fill('input[name="name"]', '更新されたプレイリスト名');
    await page.fill('textarea[name="description"]', '更新された説明');

    // 保存ボタンクリック
    await page.click('button:has-text("保存")');

    // 成功メッセージ確認
    await expect(page.locator('text=プレイリストを更新しました')).toBeVisible();

    // 更新された内容が表示されることを確認
    await expect(page.locator('text=更新されたプレイリスト名')).toBeVisible();
    await expect(page.locator('text=更新された説明')).toBeVisible();

    // 動画を並び替え（ドラッグ&ドロップ）
    const firstVideo = page.locator('.playlist-video-item:first-child');
    const secondVideo = page.locator('.playlist-video-item:nth-child(2)');

    await firstVideo.dragTo(secondVideo);

    // 並び替え成功メッセージ確認
    await expect(page.locator('text=並び順を更新しました')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証・認可テスト

#### TC-301: プレイリストAPI認証

```typescript
describe('Playlist Security - Authentication', () => {
  it('should require authentication for playlist creation', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .send({
        name: 'プレイリスト',
        is_public: true
      });

    expect(response.status).toBe(401);
  });

  it('should require authentication for my-playlists', async () => {
    const response = await request(app)
      .get('/api/playlists/my-playlists');

    expect(response.status).toBe(401);
  });

  it('should require ownership for playlist update', async () => {
    const owner = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'TestPass123!' });

    const playlistRes = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${owner.body.access_token}`)
      .send({ name: 'オーナーのプレイリスト', is_public: true });

    const otherUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .patch(`/api/playlists/${playlistRes.body.playlist.id}`)
      .set('Authorization', `Bearer ${otherUser.body.access_token}`)
      .send({ name: '不正な更新' });

    expect(response.status).toBe(403);
  });
});
```

---

### 5.2 XSS対策テスト

#### TC-302: プレイリスト名・説明のサニタイズ

```typescript
describe('Playlist Security - XSS Prevention', () => {
  it('should sanitize playlist name (XSS)', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: '<script>alert("XSS")</script>プレイリスト',
        is_public: true
      });

    expect(response.status).toBe(201);
    expect(response.body.playlist.name).not.toContain('<script>');
  });

  it('should sanitize playlist description', async () => {
    const response = await request(app)
      .post('/api/playlists/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'プレイリスト',
        description: '<img src=x onerror="alert(1)">説明',
        is_public: true
      });

    expect(response.status).toBe(201);
    expect(response.body.playlist.description).not.toContain('onerror');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 API応答時間テスト

#### TC-401: プレイリスト一覧取得パフォーマンス（< 300ms）

```typescript
describe('Playlist Performance - List Retrieval', () => {
  it('should retrieve playlists within 300ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/playlists/my-playlists')
        .set('Authorization', `Bearer ${userToken}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(300);
  });
});
```

#### TC-402: プレイリスト詳細取得パフォーマンス（< 500ms）

```typescript
describe('Playlist Performance - Detail Retrieval', () => {
  it('should retrieve playlist details within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/playlists/pl_123456');
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
export const playlistTestData = {
  validPlaylist: {
    name: 'お気に入り動画',
    description: '何度も見たい動画を集めました',
    is_public: true
  },
  privatePlaylist: {
    name: '非公開プレイリスト',
    description: '自分だけのプレイリスト',
    is_public: false
  },
  minimumPlaylist: {
    name: 'A',
    is_public: true
  },
  maximumNamePlaylist: {
    name: 'a'.repeat(100),
    description: 'テスト',
    is_public: true
  }
};
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（バリデーション、並び替えロジック、動画上限チェック）
- 統合テスト: 主要API 100%（全8エンドポイント）
- E2Eテスト: クリティカルパス 100%（作成〜再生、編集フロー）
- セキュリティテスト: 認証、XSS対策 100%
- パフォーマンステスト: 一覧 < 300ms、詳細 < 500ms

---

## 9. 既知の課題・制約

- 大量動画を含むプレイリストのパフォーマンス（ページネーション対策）
- 並び替え時の競合制御（楽観的ロック）
- 削除された動画を含むプレイリストの扱い（クリーンアップジョブ）
- プレイリスト数の上限管理
