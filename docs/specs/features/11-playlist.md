# 11. プレイリスト仕様書

## 1. 概要

### 1.1 機能の目的
ユーザーが動画をグループ化して管理・再生できるプレイリスト機能を提供する。YouTube風のプレイリスト作成、管理、共有、連続再生機能を実装する。

### 1.2 対応フロントエンド画面
- `/playlist/[id]` - プレイリスト詳細・再生画面
- `/(tabs)/settings` - マイプレイリストタブ
- `/video/[id]` - プレイリストに追加ボタン
- `/channel/[id]` - チャンネルのプレイリスト一覧

### 1.3 関連機能
- `01-authentication.md` - ユーザー認証
- `04-video-management.md` - 動画管理
- `05-video-playback.md` - 動画再生
- `13-channel-creation.md` - チャンネル管理

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: プレイリスト作成
```
1. ユーザーが設定画面の「マイプレイリスト」タブにアクセス
2. 「新規プレイリスト作成」ボタンクリック
3. モーダル表示
4. プレイリスト情報入力:
   - 名前（必須、最大100文字）
   - 説明（オプション、最大500文字）
   - 公開設定（公開/非公開）
5. POST /api/playlists/create
6. プレイリスト作成完了
7. プレイリスト一覧に追加表示
```

#### フロー2: プレイリストに動画追加
```
1. ユーザーが動画詳細ページで「保存」ボタンクリック
2. プレイリスト選択モーダル表示
3. 既存プレイリスト一覧表示
4. プレイリスト選択 or 「新規プレイリスト作成」
5. POST /api/playlists/:id/videos/add
6. 動画がプレイリストに追加
7. 成功メッセージ表示
```

#### フロー3: プレイリスト再生
```
1. ユーザーがプレイリスト詳細ページにアクセス
2. GET /api/playlists/:id → プレイリスト詳細取得
3. 動画一覧表示（サムネイル、タイトル、再生時間）
4. 「再生」ボタンクリック
5. 最初の動画から順次再生開始
6. 動画終了時に次の動画を自動再生（連続再生）
7. 最後の動画終了後、プレイリスト詳細に戻る
```

#### フロー4: プレイリスト編集
```
1. ユーザーがプレイリスト詳細ページで「編集」ボタンクリック
2. 編集モーダル表示
3. プレイリスト情報編集:
   - 名前、説明、公開設定変更
   - 動画の並び替え（ドラッグ&ドロップ）
   - 動画の削除
4. PATCH /api/playlists/:id
5. 変更内容を保存
6. プレイリスト詳細に反映
```

#### フロー5: プレイリスト削除
```
1. ユーザーがプレイリスト詳細ページで「削除」ボタンクリック
2. 確認ダイアログ表示
3. 確認後、DELETE /api/playlists/:id
4. プレイリスト削除（動画は削除されない）
5. プレイリスト一覧に戻る
```

### 2.2 エッジケース
- 同じ動画を複数回追加
- プレイリストの動画上限超過
- 削除された動画を含むプレイリスト再生
- 非公開動画を含む公開プレイリスト
- プレイリストの動画がすべて削除された場合

---

## 3. データモデル

### 3.1 テーブル定義

#### `playlists` テーブル
```sql
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  video_count INTEGER DEFAULT 0,
  thumbnail_url VARCHAR(500), -- 最初の動画のサムネイル
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_playlists_user_id (user_id),
  INDEX idx_playlists_is_public (is_public),
  INDEX idx_playlists_created_at (created_at DESC)
);
```

#### `playlist_videos` テーブル
```sql
CREATE TABLE playlist_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 並び順（0始まり）
  added_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(playlist_id, video_id),
  INDEX idx_playlist_videos_playlist_id (playlist_id),
  INDEX idx_playlist_videos_video_id (video_id),
  INDEX idx_playlist_videos_position (playlist_id, position)
);
```

#### `playlist_views` テーブル
```sql
CREATE TABLE playlist_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  viewed_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_playlist_views_playlist_id (playlist_id),
  INDEX idx_playlist_views_user_id (user_id),
  INDEX idx_playlist_views_viewed_at (viewed_at)
);
```

### 3.2 リレーション図
```
users (1) ─── (N) playlists
                    │
                    └─── (N) playlist_videos ─── (1) videos
                    │
                    └─── (N) playlist_views
```

---

## 4. API仕様

### 4.1 プレイリスト作成

**エンドポイント**: `POST /api/playlists/create`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "name": "お気に入り動画",
  "description": "何度も見たい動画を集めました",
  "is_public": true
}
```

**レスポンス** (201 Created):
```json
{
  "playlist": {
    "id": "pl_123456",
    "name": "お気に入り動画",
    "description": "何度も見たい動画を集めました",
    "is_public": true,
    "video_count": 0,
    "created_at": "2025-10-25T12:00:00Z"
  }
}
```

**エラーレスポンス**:
- `400 Bad Request` - バリデーションエラー

---

### 4.2 プレイリスト一覧取得（自分のプレイリスト）

**エンドポイント**: `GET /api/playlists/my-playlists`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "playlists": [
    {
      "id": "pl_123456",
      "name": "お気に入り動画",
      "description": "何度も見たい動画を集めました",
      "is_public": true,
      "video_count": 12,
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "created_at": "2025-10-25T12:00:00Z",
      "updated_at": "2025-10-25T15:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.3 プレイリスト詳細取得

**エンドポイント**: `GET /api/playlists/:id`

**認証**: 不要（公開プレイリストの場合）

**レスポンス** (200 OK):
```json
{
  "id": "pl_123456",
  "name": "お気に入り動画",
  "description": "何度も見たい動画を集めました",
  "is_public": true,
  "video_count": 12,
  "user_id": "usr_789",
  "user_name": "田中太郎",
  "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
  "created_at": "2025-10-25T12:00:00Z",
  "updated_at": "2025-10-25T15:00:00Z",
  "videos": [
    {
      "id": "vid_123456",
      "title": "素晴らしい動画タイトル",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "user_name": "山田花子",
      "user_avatar": "https://cdn.example.com/avatars/usr_456.jpg",
      "duration": 600,
      "view_count": 12345,
      "position": 0,
      "added_at": "2025-10-25T12:30:00Z"
    }
  ]
}
```

**エラーレスポンス**:
- `404 Not Found` - プレイリストが存在しない
- `403 Forbidden` - 非公開プレイリストで権限なし

---

### 4.4 プレイリストに動画追加

**エンドポイント**: `POST /api/playlists/:id/videos/add`

**認証**: 必須（Bearer Token、プレイリスト所有者のみ）

**リクエスト**:
```json
{
  "video_id": "vid_123456"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "プレイリストに動画を追加しました",
  "playlist_id": "pl_123456",
  "video_id": "vid_123456",
  "position": 12,
  "video_count": 13
}
```

**エラーレスポンス**:
- `400 Bad Request` - 動画が存在しない
- `403 Forbidden` - プレイリスト所有者でない
- `409 Conflict` - 既にプレイリストに追加済み
- `413 Payload Too Large` - プレイリストの動画上限超過

---

### 4.5 プレイリストから動画削除

**エンドポイント**: `DELETE /api/playlists/:id/videos/:video_id`

**認証**: 必須（Bearer Token、プレイリスト所有者のみ）

**レスポンス** (200 OK):
```json
{
  "message": "プレイリストから動画を削除しました",
  "playlist_id": "pl_123456",
  "video_id": "vid_123456",
  "video_count": 12
}
```

---

### 4.6 プレイリスト更新

**エンドポイント**: `PATCH /api/playlists/:id`

**認証**: 必須（Bearer Token、プレイリスト所有者のみ）

**リクエスト**:
```json
{
  "name": "更新されたプレイリスト名",
  "description": "更新された説明文",
  "is_public": false
}
```

**レスポンス** (200 OK):
```json
{
  "playlist": {
    "id": "pl_123456",
    "name": "更新されたプレイリスト名",
    "description": "更新された説明文",
    "is_public": false,
    "updated_at": "2025-10-25T16:00:00Z"
  }
}
```

---

### 4.7 プレイリスト削除

**エンドポイント**: `DELETE /api/playlists/:id`

**認証**: 必須（Bearer Token、プレイリスト所有者のみ）

**レスポンス** (200 OK):
```json
{
  "message": "プレイリストを削除しました",
  "playlist_id": "pl_123456"
}
```

---

### 4.8 動画の並び替え

**エンドポイント**: `POST /api/playlists/:id/videos/reorder`

**認証**: 必須（Bearer Token、プレイリスト所有者のみ）

**リクエスト**:
```json
{
  "video_orders": [
    {
      "video_id": "vid_123456",
      "position": 0
    },
    {
      "video_id": "vid_789012",
      "position": 1
    }
  ]
}
```

**レスポンス** (200 OK):
```json
{
  "message": "動画の並び順を更新しました",
  "playlist_id": "pl_123456",
  "updated_count": 2
}
```

---

### 4.9 プレイリストの動画一覧取得

**エンドポイント**: `GET /api/playlists/:id/videos`

**認証**: 不要（公開プレイリストの場合）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "playlist_id": "pl_123456",
  "videos": [
    {
      "id": "vid_123456",
      "title": "素晴らしい動画タイトル",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "user_name": "山田花子",
      "duration": 600,
      "position": 0
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.10 プレイリスト視聴記録

**エンドポイント**: `POST /api/playlists/:id/view`

**認証**: 不要

**リクエスト**:
```json
{
  "session_id": "sess_anonymous_123"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "視聴を記録しました",
  "playlist_id": "pl_123456"
}
```

---

## 5. ビジネスルール

### 5.1 バリデーション

#### プレイリスト名
- 最小1文字、最大100文字
- Unicode対応（日本語可）
- 必須

#### 説明文
- 最大500文字
- Unicode対応
- 省略可能

#### プレイリストの動画上限
- Free: 50本
- Premium: 200本
- Premium+: 500本

### 5.2 権限マトリックス

| 操作 | プレイリスト所有者 | 他のユーザー | 未ログイン |
|------|------------------|------------|----------|
| プレイリスト作成 | ✅ | ✅ | ❌ |
| プレイリスト編集 | ✅ | ❌ | ❌ |
| プレイリスト削除 | ✅ | ❌ | ❌ |
| 公開プレイリスト閲覧 | ✅ | ✅ | ✅ |
| 非公開プレイリスト閲覧 | ✅ | ❌ | ❌ |
| 動画追加 | ✅ | ❌ | ❌ |
| 動画削除 | ✅ | ❌ | ❌ |

### 5.3 並び順

- デフォルト: 追加順（最新が最後）
- ドラッグ&ドロップで並び替え可能
- `position`フィールドで管理（0始まり）

### 5.4 エラーハンドリング

#### プレイリストエラー
```json
{
  "error": "playlist_not_found",
  "message": "プレイリストが見つかりません",
  "playlist_id": "pl_123456"
}
```

#### 動画上限超過
```json
{
  "error": "playlist_video_limit_exceeded",
  "message": "プレイリストの動画上限に達しました",
  "details": {
    "current_count": 50,
    "limit": 50,
    "upgrade_plan": "premium"
  }
}
```

### 5.5 境界値

- プレイリスト名: 1-100文字
- 説明文: 0-500文字
- 動画上限: Free 50本、Premium 200本、Premium+ 500本
- プレイリスト数上限: 無制限

### 5.6 エッジケース

#### 削除された動画を含むプレイリスト
- 削除された動画は「削除されました」と表示
- 再生時はスキップして次の動画へ
- プレイリストからの手動削除を推奨（通知）

#### 非公開動画を含む公開プレイリスト
- プレイリストは公開
- 非公開動画は所有者のみ視聴可能
- 他のユーザーには「非公開動画」と表示

#### 同じ動画を複数回追加
- 1つのプレイリストに同じ動画は1回のみ
- 再度追加試行時は `409 Conflict` エラー

---

## 6. 非機能要件

### 6.1 パフォーマンス
- プレイリスト一覧取得: 300ms以内（P95）
- プレイリスト詳細取得: 500ms以内（P95）
- 動画追加: 300ms以内（P95）
- 並び替え: 500ms以内（P95）

### 6.2 セキュリティ
- CSRF保護（プレイリスト作成、編集）
- XSS対策（プレイリスト名、説明のサニタイズ）
- 権限チェック（所有者のみ編集可能）

### 6.3 スケーラビリティ
- プレイリスト一覧のページネーション
- 動画一覧のページネーション
- プレイリスト数のキャッシュ（Redis）

### 6.4 可用性
- SLA: 99.9%
- DB: PostgreSQL（マスター・スレーブ構成）
- キャッシュ: Redis（プレイリスト詳細）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- CDN: AWS CloudFront（サムネイル配信）
- DB: PostgreSQL（プレイリストデータ）

### 7.2 技術的制約
- 並び替え: `position`フィールドで管理
- 動画削除時の整合性: ON DELETE CASCADE
- サムネイル: 最初の動画のサムネイルを自動設定

### 7.3 既知の課題
- 大量動画を含むプレイリストのパフォーマンス
  - 対策: ページネーション、仮想スクロール
- 並び替え時の競合
  - 対策: 楽観的ロック、バージョン管理
- 削除された動画の処理
  - 対策: 定期的なクリーンアップジョブ

---

## 8. 関連ドキュメント
- `specs/features/04-video-management.md` - 動画管理
- `specs/features/05-video-playback.md` - 動画再生
- `specs/features/13-channel-creation.md` - チャンネル管理
- `specs/references/data-models.md` - playlistsテーブル詳細
