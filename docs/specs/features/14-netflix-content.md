# 14. Netflixコンテンツ管理仕様書

## 1. 概要

### 1.1 機能の目的
Netflix風のプレミアムコンテンツ（映画・TVシリーズ）を提供し、Premium/Premium+プラン限定の高品質な長編コンテンツを配信する。シーズン・エピソード構造をサポートし、IP権利管理を統合する。

### 1.2 対応フロントエンド画面
- `/(tabs)/netflix` - Netflix専用タブ（コンテンツ一覧）
- `/netflix/[id]` - Netflix視聴ページ（シーズン・エピソード選択）
- `/upload-netflix-movie` - 映画アップロード
- `/upload-netflix-series` - TVシリーズアップロード
- `/creation/netflix/[id]/edit` - Netflix編集画面

### 1.3 関連機能
- `02-subscription.md` - Premium/Premium+プラン管理
- `03-content-delivery.md` - 動画アップロード・CDN配信
- `05-video-playback.md` - 動画再生（再利用）
- `13-channel-creation.md` - クリエイター管理画面

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: 映画アップロード
```
1. クリエイターが「映画をアップロード」をクリック
2. タイトル、説明、ジャンル、制作国、公開年を入力
3. IP権利選択（商用利用可のIPのみ選択可能）
4. ポスター画像・背景画像をアップロード
5. 動画ファイルを選択（MP4, 最大5GB）
6. アダルトコンテンツの場合、モザイク確認チェック
7. プライバシー設定（公開/限定公開/非公開）
8. POST /api/netflix/movies
9. トランスコード開始
10. 完了後、Netflix一覧に表示
```

#### フロー2: TVシリーズアップロード
```
1. クリエイターが「シリーズをアップロード」をクリック
2. シリーズ基本情報入力（タイトル、説明、ジャンル等）
3. IP権利選択
4. ポスター・背景画像アップロード
5. シーズン1を追加
6. エピソード1を追加（タイトル、説明、動画ファイル、サムネイル）
7. エピソード2, 3...を追加
8. POST /api/netflix/series
9. 各エピソードのトランスコード開始
10. 完了後、Netflix一覧に表示
```

#### フロー3: Netflix視聴（シリーズ）
```
1. ユーザーがNetflixタブでシリーズを選択
2. GET /api/netflix/:id
3. プラン確認（Premium以上必要）
4. シリーズ詳細ページ表示
5. シーズン1、エピソード1を選択
6. GET /api/netflix/:id/episodes/:episodeId/stream
7. 署名付きHLS URLで再生開始
8. 視聴履歴に記録（エピソード単位）
9. 「次のエピソード」ボタンで連続視聴
```

#### フロー4: IP権利管理
```
1. 管理者がIP権利を登録
2. POST /api/ip-licenses
   - 名前、サムネイル、ライセンスタイプ（商用/非商用）
3. クリエイターがNetflixコンテンツ作成時にIP選択
4. 商用利用可のIPのみ選択可能
5. コンテンツにIP権利情報を紐付け
```

### 2.2 エッジケース
- 映画とシリーズの混在
- シーズンの途中追加
- エピソードの並び替え
- 複数シーズンの同時アップロード
- IP権利の変更・削除（既存コンテンツへの影響）
- プラン降格時のNetflix視聴制限

---

## 3. データモデル

### 3.1 テーブル定義

#### `netflix_contents` テーブル
```sql
CREATE TABLE netflix_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'movie', 'series'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  poster_url VARCHAR(500),
  backdrop_url VARCHAR(500),
  release_year INTEGER,
  country VARCHAR(3), -- 'JP', 'US', 'KR', etc.
  rating DECIMAL(2,1) DEFAULT 0.0,
  is_adult BOOLEAN DEFAULT FALSE,
  privacy VARCHAR(20) DEFAULT 'public', -- 'public', 'unlisted', 'private'
  ip_license_id UUID REFERENCES ip_licenses(id),

  -- 映画の場合
  duration INTEGER, -- minutes
  video_url VARCHAR(500),

  -- メタデータ
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_netflix_contents_user_id (user_id),
  INDEX idx_netflix_contents_type (type),
  INDEX idx_netflix_contents_published (is_published, published_at),
  INDEX idx_netflix_contents_ip_license (ip_license_id)
);
```

#### `netflix_genres` テーブル
```sql
CREATE TABLE netflix_genres (
  netflix_content_id UUID NOT NULL REFERENCES netflix_contents(id) ON DELETE CASCADE,
  genre VARCHAR(50) NOT NULL,

  PRIMARY KEY (netflix_content_id, genre),
  INDEX idx_netflix_genres_genre (genre)
);
```

#### `seasons` テーブル
```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  netflix_content_id UUID NOT NULL REFERENCES netflix_contents(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  title VARCHAR(255),
  description TEXT,
  release_year INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (netflix_content_id, season_number),
  INDEX idx_seasons_netflix_content (netflix_content_id)
);
```

#### `episodes` テーブル
```sql
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- minutes
  video_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (season_id, episode_number),
  INDEX idx_episodes_season (season_id)
);
```

#### `ip_licenses` テーブル
```sql
CREATE TABLE ip_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(500),
  license_type VARCHAR(50) NOT NULL, -- '商用利用可', '非商用のみ'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_ip_licenses_active (is_active)
);
```

#### `netflix_watch_history` テーブル
```sql
CREATE TABLE netflix_watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  netflix_content_id UUID NOT NULL REFERENCES netflix_contents(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE, -- シリーズの場合
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  watched_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_netflix_watch_history_user (user_id),
  INDEX idx_netflix_watch_history_content (netflix_content_id),
  INDEX idx_netflix_watch_history_episode (episode_id)
);
```

### 3.2 リレーション図
```
users (1) ─── (N) netflix_contents
                    │
                    ├─── (N) netflix_genres
                    │
                    ├─── (N) seasons
                    │         │
                    │         └─── (N) episodes
                    │
                    └─── (1) ip_licenses

users (1) ─── (N) netflix_watch_history ─── (1) netflix_contents
                                        │
                                        └─── (1) episodes
```

---

## 4. API仕様

### 4.1 Netflix一覧取得

**エンドポイント**: `GET /api/netflix`

**認証**: 不要（公開コンテンツのみ返却）

**クエリパラメータ**:
- `type`: 'movie' | 'series' | 'all'（デフォルト: 'all'）
- `genre`: ジャンルフィルタ
- `country`: 制作国フィルタ
- `limit`: 取得数（デフォルト: 20）
- `offset`: オフセット

**レスポンス** (200 OK):
```json
{
  "contents": [
    {
      "id": "nc_123456",
      "type": "series",
      "title": "ダークファンタジー：失われた王国",
      "description": "古代の王国を舞台に...",
      "poster_url": "https://cdn.example.com/posters/nc_123456.jpg",
      "backdrop_url": "https://cdn.example.com/backdrops/nc_123456.jpg",
      "release_year": 2023,
      "country": "JP",
      "genres": ["ファンタジー", "アドベンチャー"],
      "rating": 4.8,
      "is_adult": false,
      "season_count": 2
    },
    {
      "id": "nc_789012",
      "type": "movie",
      "title": "サイバーパンク：ネオン都市",
      "description": "近未来のメガシティを舞台に...",
      "poster_url": "https://cdn.example.com/posters/nc_789012.jpg",
      "backdrop_url": "https://cdn.example.com/backdrops/nc_789012.jpg",
      "release_year": 2024,
      "country": "JP",
      "genres": ["SF", "アクション"],
      "rating": 4.5,
      "is_adult": false,
      "duration": 135
    }
  ],
  "total": 50,
  "offset": 0,
  "limit": 20
}
```

---

### 4.2 Netflix詳細取得

**エンドポイント**: `GET /api/netflix/:id`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK) - シリーズの場合:
```json
{
  "id": "nc_123456",
  "type": "series",
  "title": "ダークファンタジー：失われた王国",
  "description": "古代の王国を舞台に、運命に導かれた若者たちが世界を救う旅に出る壮大なファンタジー。",
  "poster_url": "https://cdn.example.com/posters/nc_123456.jpg",
  "backdrop_url": "https://cdn.example.com/backdrops/nc_123456.jpg",
  "release_year": 2023,
  "country": "JP",
  "genres": ["ファンタジー", "アドベンチャー", "アクション"],
  "rating": 4.8,
  "is_adult": false,
  "ip_license": {
    "id": "ip_001",
    "name": "ファンタジーワールドキャラクター",
    "license_type": "商用利用可"
  },
  "seasons": [
    {
      "season_number": 1,
      "title": "シーズン1",
      "episode_count": 12,
      "episodes": [
        {
          "id": "ep_001",
          "episode_number": 1,
          "title": "始まりの地",
          "description": "平和な村で育った少年が、運命の剣を手にする。",
          "duration": 45,
          "thumbnail_url": "https://cdn.example.com/episodes/ep_001.jpg",
          "view_count": 15000
        }
      ]
    }
  ],
  "view_count": 50000,
  "like_count": 3500,
  "created_at": "2023-01-01T00:00:00Z"
}
```

**レスポンス** (200 OK) - 映画の場合:
```json
{
  "id": "nc_789012",
  "type": "movie",
  "title": "サイバーパンク：ネオン都市",
  "description": "近未来のメガシティを舞台に、一人のハッカーが巨大企業に立ち向かう。",
  "poster_url": "https://cdn.example.com/posters/nc_789012.jpg",
  "backdrop_url": "https://cdn.example.com/backdrops/nc_789012.jpg",
  "release_year": 2024,
  "country": "JP",
  "genres": ["SF", "アクション", "スリラー"],
  "rating": 4.5,
  "is_adult": false,
  "duration": 135,
  "video_url": "https://cdn.example.com/movies/nc_789012.m3u8",
  "ip_license": {
    "id": "ip_002",
    "name": "サイバーパンクシティ",
    "license_type": "商用利用可"
  },
  "view_count": 25000,
  "like_count": 1800,
  "created_at": "2024-06-01T00:00:00Z"
}
```

**エラーレスポンス**:
- `403 Forbidden` - Premium以上のプランが必要
- `404 Not Found` - コンテンツが存在しない

---

### 4.3 エピソードストリーミングURL取得

**エンドポイント**: `GET /api/netflix/:id/episodes/:episodeId/stream`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "episode_id": "ep_001",
  "streams": [
    {
      "quality": "1080p",
      "url": "https://cdn.example.com/episodes/ep_001_1080p.m3u8?signature=xxx",
      "bitrate": 5000
    },
    {
      "quality": "720p",
      "url": "https://cdn.example.com/episodes/ep_001_720p.m3u8?signature=xxx",
      "bitrate": 2500
    }
  ],
  "thumbnail_url": "https://cdn.example.com/episodes/ep_001.jpg",
  "expires_in": 86400
}
```

**エラーレスポンス**:
- `403 Forbidden` - Premium以上のプランが必要
- `404 Not Found` - エピソードが存在しない

---

### 4.4 映画作成

**エンドポイント**: `POST /api/netflix/movies`

**認証**: 必須（Bearer Token、Creator権限）

**リクエスト**:
```json
{
  "title": "サイバーパンク：ネオン都市",
  "description": "近未来のメガシティを舞台に...",
  "genres": ["SF", "アクション", "スリラー"],
  "country": "JP",
  "release_year": 2024,
  "rating": 4.5,
  "duration": 135,
  "is_adult": false,
  "privacy": "public",
  "ip_license_id": "ip_002",
  "poster_url": "https://cdn.example.com/posters/temp_xxx.jpg",
  "backdrop_url": "https://cdn.example.com/backdrops/temp_xxx.jpg",
  "video_file_id": "mf_xxx"
}
```

**レスポンス** (201 Created):
```json
{
  "id": "nc_789012",
  "title": "サイバーパンク：ネオン都市",
  "type": "movie",
  "status": "processing",
  "created_at": "2024-06-01T00:00:00Z"
}
```

---

### 4.5 シリーズ作成

**エンドポイント**: `POST /api/netflix/series`

**認証**: 必須（Bearer Token、Creator権限）

**リクエスト**:
```json
{
  "title": "ダークファンタジー：失われた王国",
  "description": "古代の王国を舞台に...",
  "genres": ["ファンタジー", "アドベンチャー"],
  "country": "JP",
  "release_year": 2023,
  "rating": 4.8,
  "is_adult": false,
  "privacy": "public",
  "ip_license_id": "ip_001",
  "poster_url": "https://cdn.example.com/posters/temp_xxx.jpg",
  "backdrop_url": "https://cdn.example.com/backdrops/temp_xxx.jpg",
  "seasons": [
    {
      "season_number": 1,
      "title": "シーズン1",
      "episodes": [
        {
          "episode_number": 1,
          "title": "始まりの地",
          "description": "平和な村で育った少年が...",
          "duration": 45,
          "video_file_id": "mf_ep001",
          "thumbnail_url": "https://cdn.example.com/temp_ep001.jpg"
        },
        {
          "episode_number": 2,
          "title": "旅立ちの決意",
          "description": "村が襲撃され...",
          "duration": 48,
          "video_file_id": "mf_ep002",
          "thumbnail_url": "https://cdn.example.com/temp_ep002.jpg"
        }
      ]
    }
  ]
}
```

**レスポンス** (201 Created):
```json
{
  "id": "nc_123456",
  "title": "ダークファンタジー：失われた王国",
  "type": "series",
  "status": "processing",
  "seasons": [
    {
      "season_number": 1,
      "episode_count": 2,
      "status": "processing"
    }
  ],
  "created_at": "2023-01-01T00:00:00Z"
}
```

---

### 4.6 Netflixコンテンツ更新

**エンドポイント**: `PATCH /api/netflix/:id`

**認証**: 必須（Bearer Token、所有者またはAdmin）

**リクエスト**:
```json
{
  "title": "新しいタイトル",
  "description": "新しい説明",
  "genres": ["SF", "アクション"],
  "privacy": "unlisted"
}
```

**レスポンス** (200 OK):
```json
{
  "id": "nc_123456",
  "title": "新しいタイトル",
  "updated_at": "2024-06-15T00:00:00Z"
}
```

---

### 4.7 Netflixコンテンツ削除

**エンドポイント**: `DELETE /api/netflix/:id`

**認証**: 必須（Bearer Token、所有者またはAdmin）

**レスポンス** (200 OK):
```json
{
  "message": "Netflix content deleted successfully"
}
```

---

### 4.8 IP権利一覧取得

**エンドポイント**: `GET /api/ip-licenses`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `license_type`: '商用利用可' | '非商用のみ'

**レスポンス** (200 OK):
```json
[
  {
    "id": "ip_001",
    "name": "ファンタジーワールドキャラクター",
    "thumbnail_url": "https://cdn.example.com/ip/ip_001.jpg",
    "license_type": "商用利用可",
    "description": "ファンタジー世界のキャラクター IP"
  },
  {
    "id": "ip_002",
    "name": "サイバーパンクシティ",
    "thumbnail_url": "https://cdn.example.com/ip/ip_002.jpg",
    "license_type": "商用利用可",
    "description": "サイバーパンク都市の IP"
  }
]
```

---

### 4.9 IP権利作成

**エンドポイント**: `POST /api/ip-licenses`

**認証**: 必須（Bearer Token、Admin権限）

**リクエスト**:
```json
{
  "name": "魔法少女シリーズ",
  "thumbnail_url": "https://cdn.example.com/ip/new.jpg",
  "license_type": "商用利用可",
  "description": "魔法少女アニメの IP"
}
```

**レスポンス** (201 Created):
```json
{
  "id": "ip_003",
  "name": "魔法少女シリーズ",
  "license_type": "商用利用可",
  "created_at": "2024-06-15T00:00:00Z"
}
```

---

### 4.10 視聴履歴記録

**エンドポイント**: `POST /api/netflix/:id/watch-progress`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "episode_id": "ep_001",
  "progress_seconds": 1800,
  "duration_seconds": 2700
}
```

**レスポンス** (200 OK):
```json
{
  "message": "Watch progress saved"
}
```

---

## 5. ビジネスルール

### 5.1 プラン制限

| プラン | Netflix映画視聴 | Netflixシリーズ視聴 | Netflixアップロード |
|-------|---------------|---------------------|-------------------|
| Free | ❌ | ❌ | ❌ |
| Premium | ✅ | ✅ | ✅ (非アダルトのみ) |
| Premium+ | ✅ | ✅ | ✅ (全て) |

### 5.2 映画 vs シリーズ

#### 映画
- 単一の動画ファイル
- `duration`（分）必須
- `video_url`必須
- `seasons`なし

#### シリーズ
- 複数シーズン・エピソード
- `duration`不要（エピソード単位で持つ）
- `video_url`不要
- `seasons`必須（最低1シーズン、1エピソード）

### 5.3 IP権利管理

- **商用利用可**: Netflixコンテンツで使用可能
- **非商用のみ**: Netflixコンテンツでは使用不可（表示のみ）
- IP権利削除時: 紐づくNetflixコンテンツは`ip_license_id = NULL`に更新

### 5.4 アップロード制限

| プラン | 映画最大サイズ | エピソード最大サイズ | 月間上限 |
|-------|-------------|-------------------|---------|
| Premium | 5GB | 2GB/エピソード | 10作品 |
| Premium+ | 10GB | 5GB/エピソード | 50作品 |

### 5.5 バリデーション

- タイトル: 1〜255文字
- 説明: 最大5000文字
- ジャンル: 1〜5個
- 公開年: 1900〜現在年+5
- レーティング: 0.0〜5.0
- 映画の長さ: 10分〜300分
- エピソードの長さ: 5分〜120分
- シーズン番号: 1以上
- エピソード番号: 1以上

### 5.6 エラーハンドリング

- `400 Bad Request` - バリデーションエラー
- `402 Payment Required` - Premium以上のプラン必要
- `403 Forbidden` - Creator権限なし、IP権利使用不可
- `404 Not Found` - コンテンツ、シーズン、エピソードが存在しない
- `409 Conflict` - 同じシーズン番号・エピソード番号が既に存在

### 5.7 境界値

- 1シリーズあたり最大シーズン数: 20
- 1シーズンあたり最大エピソード数: 50
- 同時アップロード: 3作品まで

### 5.8 エッジケース

#### シーズン追加時
- 既存シリーズに新シーズン追加可能
- シーズン番号は連番である必要なし（シーズン1の次にシーズン3も可）

#### エピソード削除時
- エピソード削除後も番号は詰めない（エピソード2削除→1, 3, 4...）
- 視聴履歴は保持

#### IP権利変更時
- 既存コンテンツには影響なし
- 新規コンテンツから新しいライセンスタイプ適用

---

## 6. 非機能要件

### 6.1 パフォーマンス
- Netflix一覧取得: 300ms以内
- コンテンツ詳細取得: 200ms以内
- エピソードストリーミングURL取得: 200ms以内
- 1エピソードのトランスコード: 実時間の0.5倍

### 6.2 セキュリティ
- Premium以上のプラン確認必須
- 署名付きストリーミングURL（有効期限24時間）
- IP権利管理はAdmin権限のみ
- アダルトコンテンツはPremium+のみ

### 6.3 スケーラビリティ
- 1シリーズあたり最大20シーズン、各シーズン50エピソード
- 複数エピソードの並列トランスコード
- CDNキャッシュでオリジン負荷軽減

### 6.4 可用性
- トランスコード失敗時の自動リトライ
- エピソード単位での部分公開可能
- S3: 99.99%、CloudFront: 99.9%

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- **ストレージ**: AWS S3（動画、ポスター、背景画像）
- **CDN**: AWS CloudFront / Cloudflare
- **トランスコード**: AWS MediaConvert（複数エピソード並列処理）
- **メタデータ検索**: Elasticsearch（タイトル、説明、ジャンル）

### 7.2 技術的制約
- シーズン・エピソード構造の複雑性
- 大量エピソードの一括アップロード処理
- トランスコードキューの優先度管理
- IP権利の変更履歴管理（監査ログ）

### 7.3 既知の課題
- シリーズの途中シーズン削除の扱い
- IP権利削除時の既存コンテンツ影響
- 複数シーズンの並列トランスコード時の負荷
- DRMライセンス管理（Netflix独自コンテンツの場合）

---

## 8. 関連ドキュメント
- `specs/references/data-models.md` - netflix_contents, seasons, episodesテーブル詳細
- `specs/references/api-endpoints.md` - 全APIエンドポイント一覧
- `specs/architecture/content-delivery.md` - CDN・トランスコード戦略
- `02-subscription.md` - Premium/Premium+プラン詳細
- `03-content-delivery.md` - 動画アップロード・トランスコード共通処理
