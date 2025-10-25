# 06. ショート動画管理仕様書

## 1. 概要

### 1.1 機能の目的
TikTok/Instagram Reels形式の縦型短尺動画のアップロード、編集、削除、メタデータ管理を提供し、クリエイターが手軽にショートコンテンツを投稿できるようにする。

### 1.2 対応フロントエンド画面
- `/upload-short` - ショート動画アップロード画面
- `/creation` - クリエイターダッシュボード（コンテンツ管理）
- `/creation/short/[id]/edit` - ショート動画編集画面
- `/(tabs)/shorts` - ショートフィード

### 1.3 関連機能
- `01-authentication.md` - クリエイター権限チェック
- `03-content-delivery.md` - 動画アップロード・トランスコード
- `07-short-playback.md` - ショート再生・視聴
- `13-channel-creation.md` - チャンネル管理

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: ショート動画アップロード
```
1. クリエイターが /creation の Upload タブにアクセス
2. 「ショート動画をアップロード」を選択
3. 縦型動画ファイル選択（9:16推奨、最大60秒）
4. メタデータ入力（タイトル、説明、カテゴリ、タグ）
5. サムネイル自動生成（最初のフレーム）
6. プライバシー設定（公開/限定公開/非公開）
7. アダルトコンテンツフラグ設定
8. POST /api/shorts/create
9. アップロード処理開始（進捗表示）
10. トランスコード完了後、公開
```

#### フロー2: ショート動画編集
```
1. クリエイターが /creation の Contents タブで「Shorts」を選択
2. 編集したいショートの「編集」ボタンクリック
3. /creation/short/[id]/edit に遷移
4. メタデータ編集（タイトル、説明、カテゴリ等）
5. サムネイル変更（オプション）
6. PATCH /api/shorts/:id
7. 変更内容が即座に反映
8. 成功メッセージ表示
```

#### フロー3: ショート動画削除
```
1. クリエイターが /creation の Contents タブで「Shorts」を選択
2. 削除したいショートの「削除」ボタンクリック
3. 確認ダイアログ表示
4. 確認後、DELETE /api/shorts/:id
5. ショート動画ファイル・関連データの削除
6. ショート一覧から消去
```

#### フロー4: カテゴリ・タグ管理
```
1. ショート編集画面でカテゴリ選択
2. タグ入力（カンマ区切り or チップ形式）
3. カテゴリ検索で既存カテゴリ表示
4. タグオートコンプリート（既存タグ提案）
5. 保存時に正規化（小文字化、重複削除）
```

### 2.2 エッジケース
- 60秒超のショート動画のアップロード試行
- 横向き動画のアップロード
- アップロード中のネットワーク切断
- アダルトコンテンツの誤フラグ設定
- 大量のショート一括削除

---

## 3. データモデル

### 3.1 テーブル定義

#### `shorts` テーブル
```sql
CREATE TABLE shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  duration INTEGER NOT NULL, -- 秒数（最大60秒）
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
  INDEX idx_shorts_user_id (user_id),
  INDEX idx_shorts_category (category),
  INDEX idx_shorts_privacy (privacy),
  INDEX idx_shorts_is_adult (is_adult),
  INDEX idx_shorts_created_at (created_at DESC),
  INDEX idx_shorts_view_count (view_count DESC)
);
```

#### `short_tags` テーブル
```sql
CREATE TABLE short_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(short_id, tag),
  INDEX idx_short_tags_short_id (short_id),
  INDEX idx_short_tags_tag (tag)
);
```

#### `short_categories` テーブル
```sql
CREATE TABLE short_categories (
  id VARCHAR(50) PRIMARY KEY,
  name_ja VARCHAR(50) NOT NULL,
  name_en VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- 初期データ
INSERT INTO short_categories VALUES
('dance', 'ダンス', 'Dance', 'musical-notes', 1, true),
('comedy', 'コメディ', 'Comedy', 'happy', 2, true),
('beauty', '美容', 'Beauty', 'rose', 3, true),
('food', 'グルメ', 'Food', 'restaurant', 4, true),
('fitness', 'フィットネス', 'Fitness', 'fitness', 5, true),
('travel', '旅行', 'Travel', 'airplane', 6, true),
('pets', 'ペット', 'Pets', 'paw', 7, true),
('art', 'アート', 'Art', 'color-palette', 8, true),
('adult', 'アダルト', 'Adult', 'warning', 9, true);
```

#### `short_versions` テーブル
```sql
CREATE TABLE short_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(200),
  description TEXT,
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(short_id, version_number),
  INDEX idx_short_versions_short_id (short_id)
);
```

### 3.2 リレーション図
```
users (1) ─── (N) shorts
                    │
                    ├─── (N) short_tags
                    │
                    ├─── (1) short_categories
                    │
                    ├─── (1) media_files
                    │
                    └─── (N) short_versions
```

---

## 4. API仕様

### 4.1 ショート動画作成

**エンドポイント**: `POST /api/shorts/create`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト**:
```json
{
  "title": "素晴らしいショート動画",
  "description": "踊ってみた！",
  "category": "dance",
  "tags": ["ダンス", "踊ってみた", "TikTok"],
  "privacy": "public",
  "is_adult": false,
  "thumbnail_file": "base64_encoded_image_or_url",
  "video_file": "reference_to_uploaded_file"
}
```

**レスポンス** (201 Created):
```json
{
  "short": {
    "id": "short_123456",
    "title": "素晴らしいショート動画",
    "description": "踊ってみた！",
    "category": "dance",
    "tags": ["ダンス", "踊ってみた", "TikTok"],
    "privacy": "public",
    "is_adult": false,
    "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456.jpg",
    "status": "processing",
    "created_at": "2025-10-25T12:00:00Z"
  },
  "upload_status": {
    "status": "processing",
    "progress": 10,
    "estimated_completion": "2025-10-25T12:10:00Z"
  }
}
```

**エラーレスポンス**:
- `400 Bad Request` - バリデーションエラー（60秒超、横向き動画等）
- `403 Forbidden` - クリエイター権限なし
- `413 Payload Too Large` - ファイルサイズ超過

---

### 4.2 ショート動画一覧取得（自分のショート）

**エンドポイント**: `GET /api/shorts/my-shorts`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20、最大: 100）
- `sort` (string): ソート順（`created_at`, `view_count`, `like_count`）
- `order` (string): 昇順/降順（`asc`, `desc`）
- `privacy` (string): プライバシーフィルター（`public`, `unlisted`, `private`）

**レスポンス** (200 OK):
```json
{
  "shorts": [
    {
      "id": "short_123456",
      "title": "素晴らしいショート動画",
      "description": "踊ってみた！",
      "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456.jpg",
      "category": "dance",
      "duration": 30,
      "privacy": "public",
      "is_adult": false,
      "view_count": 5678,
      "like_count": 234,
      "comment_count": 45,
      "created_at": "2025-10-20T12:00:00Z",
      "status": "published"
    }
  ],
  "pagination": {
    "total": 58,
    "page": 1,
    "limit": 20,
    "total_pages": 3
  }
}
```

---

### 4.3 ショート動画詳細取得

**エンドポイント**: `GET /api/shorts/:id`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "id": "short_123456",
  "title": "素晴らしいショート動画",
  "description": "踊ってみた！",
  "video_url": "https://cdn.example.com/shorts/short_123456.m3u8",
  "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456.jpg",
  "category": "dance",
  "tags": ["ダンス", "踊ってみた", "TikTok"],
  "duration": 30,
  "privacy": "public",
  "is_adult": false,
  "view_count": 5678,
  "like_count": 234,
  "comment_count": 45,
  "user_id": "usr_789",
  "user_name": "田中太郎",
  "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
  "created_at": "2025-10-20T12:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z"
}
```

**エラーレスポンス**:
- `404 Not Found` - ショートが存在しない
- `403 Forbidden` - 非公開ショートで権限なし

---

### 4.4 ショート動画更新

**エンドポイント**: `PATCH /api/shorts/:id`

**認証**: 必須（Bearer Token、ショート所有者のみ）

**リクエスト**:
```json
{
  "title": "更新されたタイトル",
  "description": "更新された説明文",
  "category": "comedy",
  "tags": ["新しいタグ", "更新"],
  "privacy": "unlisted",
  "is_adult": false
}
```

**レスポンス** (200 OK):
```json
{
  "short": {
    "id": "short_123456",
    "title": "更新されたタイトル",
    "description": "更新された説明文",
    "category": "comedy",
    "tags": ["新しいタグ", "更新"],
    "privacy": "unlisted",
    "updated_at": "2025-10-25T12:00:00Z"
  }
}
```

**エラーレスポンス**:
- `403 Forbidden` - ショート所有者でない
- `404 Not Found` - ショートが存在しない

---

### 4.5 ショート動画削除

**エンドポイント**: `DELETE /api/shorts/:id`

**認証**: 必須（Bearer Token、ショート所有者のみ）

**レスポンス** (200 OK):
```json
{
  "message": "ショート動画を削除しました",
  "short_id": "short_123456"
}
```

**エラーレスポンス**:
- `403 Forbidden` - ショート所有者でない
- `404 Not Found` - ショートが存在しない

---

### 4.6 サムネイル更新

**エンドポイント**: `PATCH /api/shorts/:id/thumbnail`

**認証**: 必須（Bearer Token、ショート所有者のみ）

**リクエスト**:
```json
{
  "thumbnail": "base64_encoded_image_or_url"
}
```

**レスポンス** (200 OK):
```json
{
  "short_id": "short_123456",
  "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456_new.jpg",
  "updated_at": "2025-10-25T12:00:00Z"
}
```

---

### 4.7 カテゴリ一覧取得

**エンドポイント**: `GET /api/shorts/categories`

**認証**: 不要

**レスポンス** (200 OK):
```json
{
  "categories": [
    {
      "id": "dance",
      "name": "ダンス",
      "name_en": "Dance",
      "icon": "musical-notes"
    },
    {
      "id": "comedy",
      "name": "コメディ",
      "name_en": "Comedy",
      "icon": "happy"
    }
  ]
}
```

---

### 4.8 タグサジェスト取得

**エンドポイント**: `GET /api/shorts/tags/suggest`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `q` (string): 検索クエリ
- `limit` (integer): 取得件数（デフォルト: 10）

**レスポンス** (200 OK):
```json
{
  "suggestions": [
    {
      "tag": "ダンス",
      "count": 8901
    },
    {
      "tag": "ダンスチャレンジ",
      "count": 456
    }
  ]
}
```

---

### 4.9 ショート一括削除

**エンドポイント**: `POST /api/shorts/bulk-delete`

**認証**: 必須（Bearer Token、ショート所有者のみ）

**リクエスト**:
```json
{
  "short_ids": ["short_123456", "short_789012", "short_345678"]
}
```

**レスポンス** (200 OK):
```json
{
  "message": "3件のショート動画を削除しました",
  "deleted_count": 3,
  "failed": []
}
```

---

### 4.10 ショートプライバシー一括変更

**エンドポイント**: `POST /api/shorts/bulk-update-privacy`

**認証**: 必須（Bearer Token、ショート所有者のみ）

**リクエスト**:
```json
{
  "short_ids": ["short_123456", "short_789012"],
  "privacy": "unlisted"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "2件のショート動画のプライバシー設定を更新しました",
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
- 最大1000文字
- Unicode対応
- 省略可能

#### カテゴリ
- `short_categories`テーブルの有効なカテゴリIDのみ
- 省略可能（省略時は「その他」カテゴリ）

#### タグ
- 最大30個
- 各タグ最大50文字
- 重複不可
- 自動で小文字化・トリム

#### 動画仕様
- 最大時間: 60秒
- 推奨アスペクト比: 9:16（縦型）
- 許容アスペクト比: 16:9（横型も可、表示は上下黒帯）
- 最大ファイルサイズ: 500MB（Premium）、1GB（Premium+）

#### プライバシー
- `public` - 公開（検索可能、フィード表示）
- `unlisted` - 限定公開（URLを知っている人のみ）
- `private` - 非公開（本人のみ）

### 5.2 権限マトリックス

| 操作 | ショート所有者 | 他のユーザー | 未ログイン |
|------|-------------|------------|----------|
| ショート作成 | ✅ | ✅（クリエイター権限） | ❌ |
| ショート編集 | ✅ | ❌ | ❌ |
| ショート削除 | ✅ | ❌ | ❌ |
| 公開ショート閲覧 | ✅ | ✅ | ✅ |
| 限定公開ショート閲覧 | ✅ | ✅（URLあり） | ✅（URLあり） |
| 非公開ショート閲覧 | ✅ | ❌ | ❌ |

### 5.3 エラーハンドリング

#### アップロードエラー
```json
{
  "error": "upload_failed",
  "message": "ショート動画のアップロードに失敗しました",
  "details": {
    "reason": "duration_exceeded",
    "max_duration": 60,
    "uploaded_duration": 75
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
      "field": "duration",
      "message": "ショート動画は60秒以内である必要があります"
    },
    {
      "field": "aspect_ratio",
      "message": "縦型（9:16）または横型（16:9）の動画を推奨します"
    }
  ]
}
```

### 5.4 境界値

- 同時アップロード: Premium 3本、Premium+ 5本
- 1日のショート投稿数: 100本まで
- タイトル長: 1-200文字
- 説明文長: 0-1000文字
- タグ数: 0-30個
- 各タグ長: 1-50文字
- 動画時間: 最大60秒

### 5.5 エッジケース

#### 60秒超の動画
- アップロード時にエラー
- 60秒でカットする編集機能は提供しない（ユーザー側で編集）

#### 横向き動画
- アップロード可能
- 再生時は上下に黒帯表示（または左右切り取り）

#### アダルトコンテンツのモザイクチェック
- AIによる自動検出（性器検出）
- 基準値未満 → 自動公開拒否
- 基準値以上 → 手動レビュー待ち（`status: 'pending_review'`）

#### トランスコード失敗
- 3回自動リトライ
- 全て失敗 → `status: 'failed'`
- クリエイターに通知、再アップロード推奨

---

## 6. 非機能要件

### 6.1 パフォーマンス
- ショート一覧取得: 300ms以内（P95）
- ショート更新: 500ms以内（P95）
- ショート削除: 1秒以内（P95）
- トランスコード時間: 実時間の0.3倍（30秒動画→9秒）

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
- 動画トランスコード: FFmpeg / AWS MediaConvert
- モザイクチェック: カスタムAIモデル（TensorFlow / PyTorch）

### 7.2 技術的制約
- サムネイル画像: JPEG/PNG、最大5MB
- サムネイル解像度: 720x1280推奨（9:16）
- タグの正規化: 小文字化、全角スペース除去
- バージョン履歴: 最新10件まで保存

### 7.3 既知の課題
- 縦型動画の最適化
  - 対策: 縦型専用のトランスコード設定
- アダルトコンテンツのAI誤検出
  - 対策: 手動レビューフロー、クリエイターへの異議申し立て機能
- 同時編集による競合
  - 対策: 楽観的ロック（`updated_at`チェック）

---

## 8. 関連ドキュメント
- `specs/features/03-content-delivery.md` - 動画アップロード・トランスコード
- `specs/features/07-short-playback.md` - ショート再生・視聴
- `specs/features/13-channel-creation.md` - チャンネル管理
- `specs/references/data-models.md` - shortsテーブル詳細
