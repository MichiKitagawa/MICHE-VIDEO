# 03. コンテンツ配信仕様書

## 1. 概要

### 1.1 機能の目的
動画・ショート・ライブ配信の安全なアップロード、トランスコーディング、CDN配信を提供し、高品質かつ低レイテンシーなストリーミングを実現する。

### 1.2 対応フロントエンド画面
- `/upload-video` - 動画アップロード
- `/upload-short` - ショートアップロード
- `/video/[id]` - 動画視聴
- `/short/[id]` - ショート視聴
- `/live/[id]` - ライブ視聴

### 1.3 関連機能
- `04-video-management.md` - 動画メタデータ管理
- `06-short-management.md` - ショートメタデータ管理
- `08-live-streaming.md` - ライブストリーミング

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: 動画アップロード
```
1. ユーザーがファイル選択（MP4, MOV等）
2. POST /api/upload/initiate → 署名付きURL取得
3. クライアントから直接S3へPUT（マルチパート対応）
4. アップロード完了後、POST /api/upload/complete
5. サーバーがエンコードジョブをキューに投入
6. Lambda/ECSがトランスコード実行（複数画質）
7. 完了後、動画URLをDBに保存
8. ユーザーに通知
```

#### フロー2: 動画ストリーミング
```
1. ユーザーが動画詳細ページにアクセス
2. GET /api/videos/:id → 動画メタデータ取得
3. プラン・権限チェック
4. 署名付きCDN URL返却（有効期限24時間）
5. HLS/DASH形式でストリーミング再生
6. ABR（適応ビットレート）で画質自動切替
```

#### フロー3: サムネイル生成
```
1. トランスコード時にFFmpegで3枚生成（0秒、中間、最後）
2. S3にアップロード
3. サムネイルURLをDBに保存
4. CDN経由で配信
```

### 2.2 エッジケース
- 4時間超の動画アップロード
- アップロード途中のネットワーク切断
- 不正なファイル形式（実行ファイル等）
- モザイクチェック不合格の動画
- 同時大量アップロード

---

## 3. データモデル

### 3.1 テーブル定義

#### `media_files` テーブル
```sql
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL, -- 'video', 'short', 'live'
  content_id UUID, -- videos.id, shorts.id, live_streams.id
  file_type VARCHAR(20) NOT NULL, -- 'original', 'transcoded', 'thumbnail'
  storage_provider VARCHAR(20) DEFAULT 's3',
  storage_path VARCHAR(500) NOT NULL,
  file_size BIGINT, -- bytes
  duration INTEGER, -- seconds
  resolution VARCHAR(20), -- '1920x1080', '1280x720', etc.
  bitrate INTEGER, -- kbps
  codec VARCHAR(50),
  mime_type VARCHAR(100),
  status VARCHAR(20) NOT NULL, -- 'uploading', 'uploaded', 'processing', 'ready', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_media_files_user_id (user_id),
  INDEX idx_media_files_content (content_type, content_id),
  INDEX idx_media_files_status (status)
);
```

#### `transcoding_jobs` テーブル
```sql
CREATE TABLE transcoding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  job_type VARCHAR(20) NOT NULL, -- 'video', 'audio', 'thumbnail'
  target_resolution VARCHAR(20), -- '1080p', '720p', '480p', '360p'
  target_bitrate INTEGER, -- kbps
  status VARCHAR(20) NOT NULL, -- 'queued', 'processing', 'completed', 'failed'
  external_job_id VARCHAR(255), -- AWS MediaConvert Job ID
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_transcoding_jobs_media_file_id (media_file_id),
  INDEX idx_transcoding_jobs_status (status)
);
```

#### `cdn_urls` テーブル
```sql
CREATE TABLE cdn_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  url VARCHAR(1000) NOT NULL,
  signed_url VARCHAR(2000),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_cdn_urls_media_file_id (media_file_id),
  INDEX idx_cdn_urls_expires_at (expires_at)
);
```

### 3.2 リレーション図
```
users (1) ─── (N) media_files
                    │
                    └─── (N) transcoding_jobs
                    │
                    └─── (N) cdn_urls
```

---

## 4. API仕様

### 4.1 アップロード開始

**エンドポイント**: `POST /api/upload/initiate`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "file_name": "my-video.mp4",
  "file_size": 104857600,
  "content_type": "video/mp4",
  "media_type": "video"
}
```

**レスポンス** (200 OK):
```json
{
  "upload_id": "upl_123456",
  "upload_url": "https://s3.amazonaws.com/bucket/uploads/xxx?AWSAccessKeyId=xxx",
  "media_file_id": "mf_123456",
  "expires_in": 3600
}
```

---

### 4.2 アップロード完了

**エンドポイント**: `POST /api/upload/complete`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "upload_id": "upl_123456",
  "media_file_id": "mf_123456"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "アップロードが完了しました",
  "media_file": {
    "id": "mf_123456",
    "status": "processing",
    "estimated_completion": "2025-10-25T13:00:00Z"
  }
}
```

---

### 4.3 トランスコード状態確認

**エンドポイント**: `GET /api/upload/status/:media_file_id`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "media_file_id": "mf_123456",
  "status": "processing",
  "progress": 65,
  "jobs": [
    {
      "resolution": "1080p",
      "status": "completed",
      "url": "https://cdn.example.com/videos/xxx_1080p.m3u8"
    },
    {
      "resolution": "720p",
      "status": "processing",
      "progress": 65
    },
    {
      "resolution": "480p",
      "status": "queued"
    }
  ]
}
```

---

### 4.4 署名付きストリーミングURL取得

**エンドポイント**: `GET /api/videos/:id/stream`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "video_id": "vid_123456",
  "streams": [
    {
      "quality": "1080p",
      "url": "https://cdn.example.com/videos/xxx_1080p.m3u8?signature=xxx",
      "bitrate": 5000
    },
    {
      "quality": "720p",
      "url": "https://cdn.example.com/videos/xxx_720p.m3u8?signature=xxx",
      "bitrate": 2500
    },
    {
      "quality": "480p",
      "url": "https://cdn.example.com/videos/xxx_480p.m3u8?signature=xxx",
      "bitrate": 1000
    },
    {
      "quality": "360p",
      "url": "https://cdn.example.com/videos/xxx_360p.m3u8?signature=xxx",
      "bitrate": 500
    }
  ],
  "thumbnail_url": "https://cdn.example.com/thumbnails/xxx.jpg",
  "expires_in": 86400
}
```

**エラーレスポンス**:
- `403 Forbidden` - プラン権限不足
- `404 Not Found` - 動画が存在しない
- `425 Too Early` - トランスコード処理中

---

### 4.5 サムネイルURL取得

**エンドポイント**: `GET /api/videos/:id/thumbnails`

**認証**: 不要（公開コンテンツ）

**レスポンス** (200 OK):
```json
{
  "video_id": "vid_123456",
  "thumbnails": [
    {
      "position": "start",
      "url": "https://cdn.example.com/thumbnails/vid_123456_0.jpg"
    },
    {
      "position": "middle",
      "url": "https://cdn.example.com/thumbnails/vid_123456_50.jpg"
    },
    {
      "position": "end",
      "url": "https://cdn.example.com/thumbnails/vid_123456_100.jpg"
    }
  ]
}
```

---

## 5. ビジネスルール

### 5.1 アップロード制限

| プラン | 最大ファイルサイズ | 最大動画時間 | 同時アップロード | 月間上限 |
|-------|----------------|------------|---------------|---------|
| Free | - | - | - | - |
| Premium | 2GB | 2時間 | 3本 | 100本 |
| Premium+ | 5GB | 4時間 | 5本 | 500本 |

### 5.2 対応ファイル形式

**動画**:
- MP4 (H.264/AAC)
- MOV (H.264/AAC)
- AVI
- MKV
- WebM

**ショート**:
- MP4 (H.264/AAC、縦型推奨）
- MOV

### 5.3 トランスコード仕様

#### 動画
| 画質 | 解像度 | ビットレート | 対象プラン |
|-----|--------|------------|----------|
| 1080p | 1920x1080 | 5000 kbps | Premium+ |
| 720p | 1280x720 | 2500 kbps | Premium以上 |
| 480p | 854x480 | 1000 kbps | 全プラン |
| 360p | 640x360 | 500 kbps | 全プラン |

#### ショート
| 画質 | 解像度 | ビットレート |
|-----|--------|------------|
| 1080p | 1080x1920 | 3000 kbps |
| 720p | 720x1280 | 1500 kbps |
| 480p | 480x854 | 800 kbps |

### 5.4 CDN配信

- プロトコル: HLS（HTTP Live Streaming）
- フォーマット: MPEG-TS
- ABR（適応ビットレート）対応
- 署名付きURL有効期限: 24時間
- キャッシュTTL: 7日間

### 5.5 モザイクチェック

- アダルトコンテンツは自動検出（AI）
- 性器検出アルゴリズム実行
- 基準値以上 → 自動拒否、手動レビュー必要
- 基準値未満 → 自動承認

### 5.6 エラーハンドリング

- `400 Bad Request` - ファイル形式不正、サイズ超過
- `402 Payment Required` - プランアップグレード必要
- `413 Payload Too Large` - ファイルサイズ制限超過
- `415 Unsupported Media Type` - 非対応ファイル形式
- `429 Too Many Requests` - 同時アップロード上限超過

### 5.7 境界値

- 最小動画長: 10秒
- 最大動画長: 4時間（Premium+）、2時間（Premium）
- 最小ファイルサイズ: 1MB
- 最大ファイルサイズ: 5GB（Premium+）、2GB（Premium）

### 5.8 エッジケース

#### アップロード途中の切断
- S3マルチパートアップロード継続可能
- 7日間で未完了アップロードは自動削除

#### トランスコード失敗
- 3回リトライ
- 失敗時はユーザーに通知、元ファイル返却

#### 同時視聴による負荷
- CDNエッジキャッシュで対応
- オリジンへのリクエストは最小化

---

## 6. 非機能要件

### 6.1 パフォーマンス
- アップロード開始: 500ms以内
- トランスコード開始: 30秒以内
- 1080p動画のトランスコード: 実時間の0.5倍（60分動画→30分）
- CDN配信レイテンシー: 100ms以内（国内）

### 6.2 セキュリティ
- 署名付きURL（AWS S3 Presigned URL）
- CloudFront署名付きCookie/URL
- DRM（オプション、Netflix動画のみ）
- アップロードファイルのウイルススキャン

### 6.3 スケーラビリティ
- S3: 無制限ストレージ
- トランスコード: Lambda/ECS Auto Scaling
- CDN: CloudFront（グローバル配信）

### 6.4 可用性
- S3: 99.99%（複数AZ）
- CloudFront: 99.9%
- トランスコードジョブ失敗時の自動リトライ

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- **ストレージ**: AWS S3 / Google Cloud Storage
- **CDN**: AWS CloudFront / Cloudflare
- **トランスコード**: AWS MediaConvert / FFmpeg on Lambda/ECS
- **ウイルススキャン**: ClamAV / AWS GuardDuty

### 7.2 技術的制約
- S3バケットは環境ごとに分離（dev/staging/prod）
- CloudFront OriginAccessIdentity設定必須
- Lambda最大実行時間: 15分（大容量動画はECS）
- トランスコードジョブ優先度設定（Premium+ > Premium）

### 7.3 既知の課題
- 4時間超の動画はLambdaでトランスコード不可（ECS必須）
- DRMライセンス管理の複雑性
- モザイクチェックの精度（誤検出対応）

---

## 8. 関連ドキュメント
- `specs/references/content-delivery.md` - CDN詳細仕様
- `specs/references/file-storage.md` - S3バケット設計
- `specs/architecture/scalability.md` - トランスコードスケーリング戦略
