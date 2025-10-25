# 04. 動画管理仕様書

## 1. 概要

### 1.1 機能の目的
動画コンテンツのアップロード、編集、削除、メタデータ管理を提供し、クリエイターが簡単に動画コンテンツを管理できるようにする。

### 1.2 対応フロントエンド画面
- `/upload-video` - 動画アップロード画面
- `/creation` - クリエイターダッシュボード（コンテンツ管理）
- `/creation/video/[id]/edit` - 動画編集画面
- `/(tabs)/settings` - プロフィール・チャンネル設定

### 1.3 関連機能
- `01-authentication.md` - クリエイター権限チェック
- `03-content-delivery.md` - 動画アップロード・トランスコード
- `05-video-playback.md` - 動画再生・視聴
- `13-channel-creation.md` - チャンネル管理

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: 動画アップロード
```
1. クリエイターが /creation の Upload タブにアクセス
2. 動画ファイル選択（MP4, MOV等）
3. メタデータ入力（タイトル、説明、カテゴリ、タグ）
4. サムネイル選択（自動生成 or カスタム画像）
5. プライバシー設定（公開/限定公開/非公開）
6. アダルトコンテンツフラグ設定
7. POST /api/videos/create
8. アップロード処理開始（進捗表示）
9. トランスコード完了後、公開
```

#### フロー2: 動画編集
```
1. クリエイターが /creation の Contents タブで動画一覧表示
2. 編集したい動画の「編集」ボタンクリック
3. /creation/video/[id]/edit に遷移
4. メタデータ編集（タイトル、説明、カテゴリ等）
5. サムネイル変更（オプション）
6. PATCH /api/videos/:id
7. 変更内容が即座に反映
8. 成功メッセージ表示
```

#### フロー3: 動画削除
```
1. クリエイターが /creation の Contents タブで動画一覧表示
2. 削除したい動画の「削除」ボタンクリック
3. 確認ダイアログ表示
4. 確認後、DELETE /api/videos/:id
5. 動画ファイル・関連データの削除
6. 動画一覧から消去
```

#### フロー4: カテゴリ・タグ管理
```
1. 動画編集画面でカテゴリ選択
2. タグ入力（カンマ区切り or チップ形式）
3. カテゴリ検索で既存カテゴリ表示
4. タグオートコンプリート（既存タグ提案）
5. 保存時に正規化（小文字化、重複削除）
```

### 2.2 エッジケース
- アップロード中のネットワーク切断（再開機能）
- 重複タイトルの動画投稿
- アダルトコンテンツの誤フラグ設定
- 大量の動画一括削除
- トランスコード失敗時の再試行

---

## 3. データモデル

### 3.1 テーブル定義

#### `videos` テーブル
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL, -- 秒数
  thumbnail_url VARCHAR(500),

  -- プライバシー・権限
  privacy VARCHAR(20) DEFAULT 'public', -- 'public', 'unlisted', 'private'
  is_adult BOOLEAN DEFAULT FALSE,

  -- 統計情報
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,

  -- メディアファイル参照
  media_file_id UUID REFERENCES media_files(id),

  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,

  -- インデックス
  INDEX idx_videos_user_id (user_id),
  INDEX idx_videos_category (category),
  INDEX idx_videos_privacy (privacy),
  INDEX idx_videos_is_adult (is_adult),
  INDEX idx_videos_created_at (created_at),
  INDEX idx_videos_view_count (view_count DESC)
);
```

#### `video_tags` テーブル
```sql
CREATE TABLE video_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(video_id, tag),
  INDEX idx_video_tags_video_id (video_id),
  INDEX idx_video_tags_tag (tag)
);
```

#### `video_categories` テーブル
```sql
CREATE TABLE video_categories (
  id VARCHAR(50) PRIMARY KEY,
  name_ja VARCHAR(50) NOT NULL,
  name_en VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- 初期データ
INSERT INTO video_categories VALUES
('entertainment', 'エンターテイメント', 'Entertainment', 'play-circle', 1, true),
('music', '音楽', 'Music', 'musical-notes', 2, true),
('gaming', 'ゲーム', 'Gaming', 'game-controller', 3, true),
('education', '教育', 'Education', 'school', 4, true),
('news', 'ニュース', 'News', 'newspaper', 5, true),
('sports', 'スポーツ', 'Sports', 'basketball', 6, true),
('technology', 'テクノロジー', 'Technology', 'laptop', 7, true),
('lifestyle', 'ライフスタイル', 'Lifestyle', 'cafe', 8, true),
('adult', 'アダルト', 'Adult', 'warning', 9, true);
```

#### `video_versions` テーブル
```sql
CREATE TABLE video_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(200),
  description TEXT,
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(video_id, version_number),
  INDEX idx_video_versions_video_id (video_id)
);
```

### 3.2 リレーション図
```
users (1) ─── (N) videos
                    │
                    ├─── (N) video_tags
                    │
                    ├─── (1) video_categories
                    │
                    ├─── (1) media_files
                    │
                    └─── (N) video_versions
```

---

## 4. API仕様

### 4.1 動画作成

**エンドポイント**: `POST /api/videos/create`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト**:
```json
{
  "title": "素晴らしい動画タイトル",
  "description": "この動画では〇〇について解説します。",
  "category": "education",
  "tags": ["プログラミング", "チュートリアル", "初心者向け"],
  "privacy": "public",
  "is_adult": false,
  "thumbnail_file": "base64_encoded_image_or_url",
  "video_file": "reference_to_uploaded_file"
}
```

**レスポンス** (201 Created):
```json
{
  "video": {
    "id": "vid_123456",
    "title": "素晴らしい動画タイトル",
    "description": "この動画では〇〇について解説します。",
    "category": "education",
    "tags": ["プログラミング", "チュートリアル", "初心者向け"],
    "privacy": "public",
    "is_adult": false,
    "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
    "status": "processing",
    "created_at": "2025-10-25T12:00:00Z"
  },
  "upload_status": {
    "status": "processing",
    "progress": 10,
    "estimated_completion": "2025-10-25T12:30:00Z"
  }
}
```

**エラーレスポンス**:
- `400 Bad Request` - バリデーションエラー
- `403 Forbidden` - クリエイター権限なし
- `413 Payload Too Large` - ファイルサイズ超過

---

### 4.2 動画一覧取得（自分の動画）

**エンドポイント**: `GET /api/videos/my-videos`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20、最大: 100）
- `sort` (string): ソート順（`created_at`, `view_count`, `like_count`）
- `order` (string): 昇順/降順（`asc`, `desc`）
- `privacy` (string): プライバシーフィルター（`public`, `unlisted`, `private`、省略時は全て）

**レスポンス** (200 OK):
```json
{
  "videos": [
    {
      "id": "vid_123456",
      "title": "素晴らしい動画タイトル",
      "description": "この動画では〇〇について解説します。",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "category": "education",
      "duration": 600,
      "privacy": "public",
      "is_adult": false,
      "view_count": 12345,
      "like_count": 890,
      "comment_count": 123,
      "created_at": "2025-10-20T12:00:00Z",
      "status": "published"
    }
  ],
  "pagination": {
    "total": 125,
    "page": 1,
    "limit": 20,
    "total_pages": 7
  }
}
```

---

### 4.3 動画詳細取得

**エンドポイント**: `GET /api/videos/:id`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "id": "vid_123456",
  "title": "素晴らしい動画タイトル",
  "description": "この動画では〇〇について解説します。",
  "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
  "category": "education",
  "tags": ["プログラミング", "チュートリアル", "初心者向け"],
  "duration": 600,
  "privacy": "public",
  "is_adult": false,
  "view_count": 12345,
  "like_count": 890,
  "comment_count": 123,
  "user_id": "usr_789",
  "user_name": "田中太郎",
  "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
  "created_at": "2025-10-20T12:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z",
  "published_at": "2025-10-20T12:00:00Z",
  "status": "published"
}
```

**エラーレスポンス**:
- `404 Not Found` - 動画が存在しない
- `403 Forbidden` - 非公開動画で権限なし

---

### 4.4 動画更新

**エンドポイント**: `PATCH /api/videos/:id`

**認証**: 必須（Bearer Token、動画所有者のみ）

**リクエスト**:
```json
{
  "title": "更新されたタイトル",
  "description": "更新された説明文",
  "category": "technology",
  "tags": ["新しいタグ", "更新"],
  "privacy": "unlisted",
  "is_adult": false
}
```

**レスポンス** (200 OK):
```json
{
  "video": {
    "id": "vid_123456",
    "title": "更新されたタイトル",
    "description": "更新された説明文",
    "category": "technology",
    "tags": ["新しいタグ", "更新"],
    "privacy": "unlisted",
    "updated_at": "2025-10-25T12:00:00Z"
  }
}
```

**エラーレスポンス**:
- `403 Forbidden` - 動画所有者でない
- `404 Not Found` - 動画が存在しない

---

### 4.5 動画削除

**エンドポイント**: `DELETE /api/videos/:id`

**認証**: 必須（Bearer Token、動画所有者のみ）

**レスポンス** (200 OK):
```json
{
  "message": "動画を削除しました",
  "video_id": "vid_123456"
}
```

**エラーレスポンス**:
- `403 Forbidden` - 動画所有者でない
- `404 Not Found` - 動画が存在しない

---

### 4.6 サムネイル更新

**エンドポイント**: `PATCH /api/videos/:id/thumbnail`

**認証**: 必須（Bearer Token、動画所有者のみ）

**リクエスト**:
```json
{
  "thumbnail": "base64_encoded_image_or_url"
}
```

**レスポンス** (200 OK):
```json
{
  "video_id": "vid_123456",
  "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456_new.jpg",
  "updated_at": "2025-10-25T12:00:00Z"
}
```

---

### 4.7 カテゴリ一覧取得

**エンドポイント**: `GET /api/videos/categories`

**認証**: 不要

**レスポンス** (200 OK):
```json
{
  "categories": [
    {
      "id": "entertainment",
      "name": "エンターテイメント",
      "name_en": "Entertainment",
      "icon": "play-circle"
    },
    {
      "id": "music",
      "name": "音楽",
      "name_en": "Music",
      "icon": "musical-notes"
    }
  ]
}
```

---

### 4.8 タグサジェスト取得

**エンドポイント**: `GET /api/videos/tags/suggest`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `q` (string): 検索クエリ
- `limit` (integer): 取得件数（デフォルト: 10）

**レスポンス** (200 OK):
```json
{
  "suggestions": [
    {
      "tag": "プログラミング",
      "count": 12345
    },
    {
      "tag": "プログラミング入門",
      "count": 890
    }
  ]
}
```

---

### 4.9 動画一括削除

**エンドポイント**: `POST /api/videos/bulk-delete`

**認証**: 必須（Bearer Token、動画所有者のみ）

**リクエスト**:
```json
{
  "video_ids": ["vid_123456", "vid_789012", "vid_345678"]
}
```

**レスポンス** (200 OK):
```json
{
  "message": "3件の動画を削除しました",
  "deleted_count": 3,
  "failed": []
}
```

---

### 4.10 動画プライバシー一括変更

**エンドポイント**: `POST /api/videos/bulk-update-privacy`

**認証**: 必須（Bearer Token、動画所有者のみ）

**リクエスト**:
```json
{
  "video_ids": ["vid_123456", "vid_789012"],
  "privacy": "unlisted"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "2件の動画のプライバシー設定を更新しました",
  "updated_count": 2
}
```

---

## 5. ビジネスルール

### 5.1 バリデーション

#### タイトル
- 最小1文字、最大200文字
- Unicode対応（日本語可）
- 必須

#### 説明文
- 最大5000文字
- Unicode対応
- 省略可能

#### カテゴリ
- `video_categories`テーブルの有効なカテゴリIDのみ
- 必須

#### タグ
- 最大30個
- 各タグ最大50文字
- 重複不可
- 自動で小文字化・トリム

#### プライバシー
- `public` - 公開（検索可能）
- `unlisted` - 限定公開（URLを知っている人のみ）
- `private` - 非公開（本人のみ）

#### アダルトコンテンツ
- `is_adult: true`の場合、自動的にモザイクチェック実行
- モザイク不十分の場合は公開拒否
- アダルトカテゴリは`is_adult: true`必須

### 5.2 権限マトリックス

| 操作 | 動画所有者 | 他のユーザー | 未ログイン |
|------|----------|------------|----------|
| 動画作成 | ✅ | ✅（クリエイター権限） | ❌ |
| 動画編集 | ✅ | ❌ | ❌ |
| 動画削除 | ✅ | ❌ | ❌ |
| 公開動画閲覧 | ✅ | ✅ | ✅ |
| 限定公開動画閲覧 | ✅ | ✅（URLあり） | ✅（URLあり） |
| 非公開動画閲覧 | ✅ | ❌ | ❌ |

### 5.3 エラーハンドリング

#### アップロードエラー
```json
{
  "error": "upload_failed",
  "message": "動画のアップロードに失敗しました",
  "details": {
    "reason": "file_size_exceeded",
    "max_size": "2GB",
    "uploaded_size": "2.5GB"
  }
}
```

#### バリデーションエラー
```json
{
  "error": "validation_failed",
  "message": "入力内容に誤りがあります",
  "details": [
    {
      "field": "title",
      "message": "タイトルは200文字以内で入力してください"
    },
    {
      "field": "tags",
      "message": "タグは最大30個までです"
    }
  ]
}
```

### 5.4 境界値

- 同時アップロード: Premium 3本、Premium+ 5本
- 1日の動画投稿数: 50本まで
- タイトル長: 1-200文字
- 説明文長: 0-5000文字
- タグ数: 0-30個
- 各タグ長: 1-50文字

### 5.5 エッジケース

#### タイトル重複
- 許可（警告メッセージ表示）
- 同じタイトルでも異なる動画として扱う

#### アダルトコンテンツのモザイクチェック
- AIによる自動検出（性器検出）
- 基準値未満 → 自動公開拒否
- 基準値以上 → 手動レビュー待ち（`status: 'pending_review'`）
- 手動承認後に公開可能

#### トランスコード失敗
- 3回自動リトライ
- 全て失敗 → `status: 'failed'`
- クリエイターに通知、再アップロード推奨

#### プライバシー変更
- `public` → `unlisted` / `private`: 即座に反映
- `private` → `public`: 再レビュー必要（アダルトの場合）

---

## 6. 非機能要件

### 6.1 パフォーマンス
- 動画一覧取得: 300ms以内（P95）
- 動画更新: 500ms以内（P95）
- 動画削除: 1秒以内（P95）
- サムネイル更新: 2秒以内（画像処理含む）

### 6.2 セキュリティ
- CSRF保護（トークン検証）
- XSS対策（入力サニタイズ）
- 動画ファイルのウイルススキャン必須
- アダルトコンテンツの年齢確認（Premium+プラン）

### 6.3 可用性
- SLA: 99.9%
- DB: PostgreSQL（マスター・スレーブ構成）
- ファイルストレージ: S3（Multi-AZ）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- ファイルストレージ: AWS S3 / Google Cloud Storage
- 画像処理: Sharp / ImageMagick
- ウイルススキャン: ClamAV
- モザイクチェック: カスタムAIモデル（TensorFlow / PyTorch）

### 7.2 技術的制約
- サムネイル画像: JPEG/PNG、最大5MB
- サムネイル解像度: 1280x720推奨
- タグの正規化: 小文字化、全角スペース除去
- バージョン履歴: 最新10件まで保存

### 7.3 既知の課題
- 大量タグのパフォーマンス（N+1問題）
  - 対策: タグのバッチ挿入、インデックス最適化
- アダルトコンテンツのAI誤検出
  - 対策: 手動レビューフロー、クリエイターへの異議申し立て機能
- 同時編集による競合
  - 対策: 楽観的ロック（`updated_at`チェック）

---

## 8. 関連ドキュメント
- `specs/features/03-content-delivery.md` - 動画アップロード・トランスコード
- `specs/features/05-video-playback.md` - 動画再生・視聴
- `specs/features/13-channel-creation.md` - チャンネル管理
- `specs/references/data-models.md` - videosテーブル詳細
