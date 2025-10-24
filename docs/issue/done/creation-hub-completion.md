# Creation Hub 完全実装計画

## 概要

Creation Hubには以下の3つの重要な機能が欠けています：
1. **アナリティクス機能** - 現在プレースホルダーのみ
2. **Netflix型コンテンツアップロード** - 視聴機能はあるが制作機能がない
3. **ライブ配信機能** - 完全に欠落

## 優先順位

### Phase 1: アナリティクス機能実装（最優先）
### Phase 2: Netflix型コンテンツアップロード
### Phase 3: ライブ配信機能

---

# Phase 1: アナリティクス機能実装

## 目的
クリエイターが自分のコンテンツのパフォーマンスを詳細に分析できるようにする

## 実装範囲

### 1. 全体統計サマリー
**表示内容:**
- 期間選択（過去7日、30日、90日、カスタム期間）
- 総再生回数の推移グラフ
- 総再生時間
- 平均視聴維持率
- チャンネル登録者増加数
- 総いいね数

**UI構成:**
```
┌─────────────────────────────────────────┐
│ 期間選択: [過去30日 ▼]                   │
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │視聴  │ │再生  │ │登録者│ │いいね│       │
│ │時間  │ │回数  │ │増加  │ │数   │       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
├─────────────────────────────────────────┤
│ [再生回数推移グラフ - 折れ線グラフ]        │
│                                         │
└─────────────────────────────────────────┘
```

### 2. コンテンツ別パフォーマンス
**表示内容:**
- 動画/ショート別のソート可能なテーブル
- 各コンテンツの詳細指標：
  - サムネイル
  - タイトル
  - 公開日
  - 再生回数
  - 視聴時間
  - クリック率（CTR）
  - 平均視聴時間
  - いいね/コメント数

**テーブル構造:**
```
┌──────────────────────────────────────────────────────┐
│ タブ: [動画] [ショート]                                │
├──────────────────────────────────────────────────────┤
│ ソート: [再生回数 ▼]                                  │
├────────┬────────┬────────┬────────┬────────┬────────┤
│サムネ  │タイトル│公開日  │再生回数│視聴時間│CTR    │
├────────┼────────┼────────┼────────┼────────┼────────┤
│[img]   │動画1   │2日前   │15.2万  │8:23    │12.3%  │
│[img]   │動画2   │5日前   │8.1万   │6:45    │10.1%  │
└────────┴────────┴────────┴────────┴────────┴────────┘
```

### 3. 視聴者分析
**表示内容:**
- 年齢層分布（円グラフ）
- 性別分布（円グラフ）
- 地域分布（棒グラフ）
- デバイス別視聴（円グラフ）
- アクティブ時間帯（ヒートマップ）

### 4. トラフィックソース
**表示内容:**
- 検索からの流入
- おすすめからの流入
- 外部サイトからの流入
- 直接アクセス
- チャンネルページから
- 各ソースの割合（円グラフ）

### 5. エンゲージメント
**表示内容:**
- いいね率の推移
- コメント率の推移
- シェア数
- 保存数
- チャンネル登録率（視聴後の登録率）

## 必要なコンポーネント

### 新規作成ファイル
```
components/creation/analytics/
├── OverviewStats.tsx          # 全体統計サマリー
├── PerformanceChart.tsx       # 再生回数推移グラフ
├── ContentTable.tsx           # コンテンツ別テーブル
├── AudienceAnalysis.tsx       # 視聴者分析
├── TrafficSources.tsx         # トラフィックソース
├── EngagementMetrics.tsx      # エンゲージメント指標
└── DateRangePicker.tsx        # 期間選択コンポーネント
```

### 修正ファイル
```
components/creation/AnalyticsContent.tsx  # プレースホルダーから実装に変更
```

## 必要なライブラリ
- **react-native-chart-kit** または **Victory Native**: グラフ描画用
- **react-native-svg**: グラフのベース
- **date-fns**: 日付処理

## モックデータ構造

### analytics.json
```json
{
  "overview": {
    "period": "last_30_days",
    "total_views": 1523420,
    "total_watch_time_hours": 45678,
    "avg_view_duration_seconds": 420,
    "subscribers_gained": 1234,
    "total_likes": 23456
  },
  "performance_by_content": [
    {
      "id": "video1",
      "type": "video",
      "title": "動画タイトル",
      "thumbnail_url": "...",
      "published_at": "2025-10-20",
      "views": 152340,
      "watch_time_hours": 4567,
      "ctr": 12.3,
      "avg_view_duration": 423,
      "likes": 2345,
      "comments": 123
    }
  ],
  "audience": {
    "age_distribution": {
      "13-17": 5,
      "18-24": 25,
      "25-34": 35,
      "35-44": 20,
      "45-54": 10,
      "55+": 5
    },
    "gender_distribution": {
      "male": 60,
      "female": 38,
      "other": 2
    },
    "top_regions": [
      { "country": "JP", "percentage": 45 },
      { "country": "US", "percentage": 20 },
      { "country": "KR", "percentage": 10 }
    ],
    "devices": {
      "mobile": 65,
      "desktop": 25,
      "tablet": 8,
      "tv": 2
    }
  },
  "traffic_sources": {
    "search": 30,
    "suggested": 40,
    "external": 15,
    "direct": 10,
    "channel_page": 5
  },
  "engagement": {
    "like_rate": 8.5,
    "comment_rate": 1.2,
    "share_count": 1234,
    "save_count": 567,
    "subscription_rate": 2.3
  }
}
```

## 実装ステップ

1. **モックデータ作成**
   - `mock/analytics.json` 作成
   - `utils/mockApi.ts` に `getAnalytics()` 追加

2. **DateRangePicker実装**
   - 期間選択UI
   - 期間フィルタリングロジック

3. **OverviewStats実装**
   - 統計カード表示
   - 期間比較機能

4. **PerformanceChart実装**
   - react-native-chart-kit導入
   - 折れ線グラフ実装

5. **ContentTable実装**
   - ソート機能付きテーブル
   - ページネーション

6. **AudienceAnalysis実装**
   - 円グラフ（年齢・性別・デバイス）
   - 棒グラフ（地域）

7. **TrafficSources実装**
   - 円グラフでソース比率表示

8. **EngagementMetrics実装**
   - エンゲージメント指標の表示

9. **AnalyticsContent統合**
   - すべてのコンポーネントを統合
   - レスポンシブ対応

---

# Phase 2: Netflix型コンテンツアップロード

## 目的
Netflix型サブスクリプションコンテンツ（映画・シリーズ）をクリエイターがアップロードできるようにする

## 背景
現在、視聴側では`app/(tabs)/netflix.tsx`でNetflix型コンテンツを視聴できるが、制作側（Creation Hub）でそれをアップロード・管理する機能が存在しない。

## 実装範囲

### 1. アップロードタブにNetflix型コンテンツ追加

**現在の構造:**
```
アップロード
├── 通常動画
└── ショート
```

**実装後:**
```
アップロード
├── 通常動画
├── ショート
└── Netflix型コンテンツ（新規）
```

**Netflix型カードのデザイン:**
```
┌─────────────────────────────┐
│    [TV icon]               │
│                            │
│  Netflix型コンテンツ        │
│                            │
│  映画・シリーズのアップロード│
│  サブスク限定配信           │
│                            │
│  • 映画またはシリーズ       │
│  • エピソード管理           │
│  • サブスク設定             │
│                            │
│  [アップロード開始]         │
└─────────────────────────────┘
```

### 2. Netflix型コンテンツアップロード画面

**ルート:**
- `app/upload-netflix-movie.tsx` - 映画アップロード
- `app/upload-netflix-series.tsx` - シリーズアップロード

**映画アップロード画面の構成:**
```
┌──────────────────────────────────┐
│ Netflix型コンテンツ - 映画        │
├──────────────────────────────────┤
│ コンテンツタイプ: [映画 ○] [シリーズ]│
├──────────────────────────────────┤
│ タイトル: [_______________]      │
│ 説明: [________________]         │
│ ジャンル: [アクション ▼]         │
│ 制作国: [JP ▼]                   │
│ 公開年: [2025]                   │
│ 再生時間: [120] 分               │
│ レーティング: [4.5]              │
│                                  │
│ ポスター画像: [選択]             │
│ バックドロップ画像: [選択]       │
│ 動画ファイル: [選択]             │
│                                  │
│ 成人向けコンテンツ: [OFF]        │
│                                  │
│ サブスクリプション設定            │
│ ├─ 必要プラン: [プレミアム ▼]    │
│ └─ 地域制限: [なし ▼]           │
│                                  │
│ [キャンセル] [アップロード]      │
└──────────────────────────────────┘
```

**シリーズアップロード画面の構成:**
```
┌──────────────────────────────────┐
│ Netflix型コンテンツ - シリーズ    │
├──────────────────────────────────┤
│ コンテンツタイプ: [映画] [シリーズ ○]│
├──────────────────────────────────┤
│ シリーズタイトル: [___________]   │
│ 説明: [________________]         │
│ ジャンル: [ドラマ ▼]             │
│ 制作国: [US ▼]                   │
│ 公開年: [2025]                   │
│ レーティング: [4.8]              │
│                                  │
│ ポスター画像: [選択]             │
│ バックドロップ画像: [選択]       │
│                                  │
│ ──────────────────────────       │
│ シーズン管理                      │
│ ┌─ シーズン 1                    │
│ │  エピソード数: 10               │
│ │  [エピソード追加]               │
│ │                                │
│ │  ├─ Episode 1                 │
│ │  │  タイトル: "パイロット"     │
│ │  │  時間: 45分                 │
│ │  │  [編集] [削除]              │
│ │  │                            │
│ │  ├─ Episode 2                 │
│ │  │  ...                       │
│ │                                │
│ └─ [シーズン追加]                 │
│                                  │
│ サブスクリプション設定            │
│ ├─ 必要プラン: [プレミアム ▼]    │
│ └─ 地域制限: [なし ▼]           │
│                                  │
│ [保存] [公開]                    │
└──────────────────────────────────┘
```

### 3. Netflix型コンテンツ管理

**Contentsタブの拡張:**

現在: `動画` | `ショート`

実装後: `動画` | `ショート` | `Netflix`

**Netflix タブの表示内容:**
- 映画・シリーズのリスト
- サムネイル、タイトル、タイプ（映画/シリーズ）
- 視聴回数、再生時間
- 編集・削除ボタン

### 4. Netflix型コンテンツ編集画面

**ルート:**
- `app/creation/netflix/[id]/edit.tsx`

**編集機能:**
- 基本情報の編集（タイトル、説明、ジャンルなど）
- ポスター/バックドロップ画像の変更
- シリーズの場合、エピソード追加・編集・削除
- サブスクリプション設定変更
- 公開/非公開切り替え

## 必要な型定義追加

### types/index.ts
```typescript
// Netflix型コンテンツのアップロードデータ
export interface NetflixContentUpload {
  type: 'movie' | 'series';
  title: string;
  description: string;
  genres: string[];
  country: string;
  release_year: number;
  rating: number;
  poster_image?: File;
  backdrop_image?: File;
  is_adult: boolean;
  subscription_tier: 'premium' | 'business';
  region_restriction?: string[];

  // 映画の場合
  duration?: number;
  video_file?: File;

  // シリーズの場合
  seasons?: SeasonUpload[];
}

export interface SeasonUpload {
  season_number: number;
  episodes: EpisodeUpload[];
}

export interface EpisodeUpload {
  episode_number: number;
  title: string;
  description: string;
  duration: number;
  video_file: File;
  thumbnail?: File;
}
```

## 必要なコンポーネント

### 新規作成
```
components/creation/
├── NetflixUploadCard.tsx          # アップロードタブのカード
├── SeasonManager.tsx              # シーズン管理UI
└── EpisodeForm.tsx                # エピソード入力フォーム
```

### 新規画面
```
app/
├── upload-netflix-movie.tsx       # 映画アップロード
├── upload-netflix-series.tsx      # シリーズアップロード
└── creation/
    └── netflix/
        └── [id]/
            └── edit.tsx           # Netflix編集画面
```

## モックAPI拡張

### mockApi.ts に追加
```typescript
// Netflix型コンテンツ取得
export const getUserNetflixContents = async (): Promise<NetflixContent[]>

// Netflix型コンテンツ作成
export const createNetflixContent = async (data: NetflixContentUpload): Promise<void>

// Netflix型コンテンツ更新
export const updateNetflixContent = async (id: string, updates: Partial<NetflixContent>): Promise<void>

// Netflix型コンテンツ削除
export const deleteNetflixContent = async (id: string): Promise<void>
```

## 実装ステップ

1. **型定義追加**
   - `NetflixContentUpload`関連の型を追加

2. **アップロードタブにカード追加**
   - `NetflixUploadCard`コンポーネント作成
   - `UploadContent.tsx`に統合

3. **映画アップロード画面実装**
   - `upload-netflix-movie.tsx`作成
   - フォーム入力・バリデーション
   - 画像/動画選択機能

4. **シリーズアップロード画面実装**
   - `upload-netflix-series.tsx`作成
   - `SeasonManager`コンポーネント
   - `EpisodeForm`コンポーネント

5. **Contentsタブ拡張**
   - Netflixタブ追加
   - Netflix型コンテンツ一覧表示

6. **Netflix編集画面実装**
   - `app/creation/netflix/[id]/edit.tsx`作成
   - 編集フォーム

7. **モックAPI実装**
   - `getUserNetflixContents()`
   - `createNetflixContent()`
   - `updateNetflixContent()`
   - `deleteNetflixContent()`

---

# Phase 3: ライブ配信機能

## 目的
リアルタイムでライブ配信を開始・管理できる機能を追加

## 実装範囲

### 1. アップロードタブにライブ配信カード追加

**実装後の構造:**
```
アップロード
├── 通常動画
├── ショート
├── Netflix型コンテンツ
└── ライブ配信（新規）
```

**ライブ配信カードのデザイン:**
```
┌─────────────────────────────┐
│    [Broadcast icon]        │
│                            │
│  ライブ配信                 │
│                            │
│  リアルタイムでライブ配信   │
│  視聴者とリアルタイム交流   │
│                            │
│  • リアルタイム配信         │
│  • チャット機能             │
│  • スーパーチャット対応     │
│                            │
│  [配信を開始]               │
└─────────────────────────────┘
```

### 2. ライブ配信設定画面

**ルート:**
- `app/go-live.tsx`

**画面構成:**
```
┌──────────────────────────────────┐
│ ライブ配信設定                    │
├──────────────────────────────────┤
│ 配信タイトル: [___________]       │
│ 説明: [________________]         │
│ カテゴリー: [ゲーム ▼]           │
│                                  │
│ サムネイル: [選択]               │
│                                  │
│ プライバシー設定                  │
│ ○ 公開                           │
│ ○ 限定公開（URLを知っている人）  │
│ ○ 非公開                         │
│                                  │
│ 成人向けコンテンツ: [OFF]        │
│                                  │
│ 詳細設定                          │
│ ├─ チャット: [有効 ○] [無効]    │
│ ├─ スーパーチャット: [有効 ○]   │
│ ├─ アーカイブ保存: [有効 ○]     │
│ └─ 遅延: [通常 ▼]               │
│                                  │
│ ──────────────────────────       │
│ ストリーミング情報                │
│ Stream URL: [表示/コピー]        │
│ Stream Key: [表示/コピー]        │
│                                  │
│ [キャンセル] [配信開始]          │
└──────────────────────────────────┘
```

### 3. ライブ配信中画面

**ルート:**
- `app/live/[streamId].tsx`

**画面構成（クリエイター側）:**
```
┌──────────────────────────────────┐
│ [配信中 ●LIVE]                   │
├──────────────────────────────────┤
│                                  │
│     [配信プレビュー画面]          │
│                                  │
├──────────────────────────────────┤
│ リアルタイム統計                  │
│ ├─ 視聴者数: 1,234              │
│ ├─ いいね数: 567                │
│ └─ スーパーチャット: ¥12,345    │
├──────────────────────────────────┤
│ チャット                          │
│ ┌────────────────────────────┐   │
│ │ユーザー1: こんにちは！      │   │
│ │ユーザー2: 面白い！          │   │
│ │ [💰] ユーザー3: ¥500       │   │
│ └────────────────────────────┘   │
├──────────────────────────────────┤
│ [配信を終了]                     │
└──────────────────────────────────┘
```

### 4. ライブ配信管理（Contentsタブ）

**Contentsタブに「ライブ」追加:**

現在: `動画` | `ショート` | `Netflix`

実装後: `動画` | `ショート` | `Netflix` | `ライブ`

**ライブタブの表示内容:**
- 配信中のライブ（赤いLIVEバッジ）
- スケジュール済みのライブ
- 過去の配信（アーカイブ）
- 各ライブの統計（最大同時視聴者数、総視聴者数など）

### 5. ライブアーカイブ管理

**機能:**
- ライブ配信終了後、自動的にアーカイブとして保存
- アーカイブの編集（タイトル、説明、サムネイル）
- アーカイブを通常動画として公開
- アーカイブの削除

## 必要な型定義

### types/index.ts
```typescript
export interface LiveStream {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  status: 'scheduled' | 'live' | 'ended';
  privacy: 'public' | 'unlisted' | 'private';
  is_adult: boolean;

  // 配信設定
  chat_enabled: boolean;
  super_chat_enabled: boolean;
  archive_enabled: boolean;
  delay: 'normal' | 'low' | 'ultra_low';

  // ストリーミング情報
  stream_url: string;
  stream_key: string;

  // 統計情報
  current_viewers?: number;
  peak_viewers?: number;
  total_likes?: number;
  total_super_chat?: number;

  // タイムスタンプ
  scheduled_start_time?: string;
  actual_start_time?: string;
  end_time?: string;
  created_at: string;
}

export interface LiveStreamCreate {
  title: string;
  description: string;
  category: string;
  thumbnail?: File;
  privacy: 'public' | 'unlisted' | 'private';
  is_adult: boolean;
  chat_enabled: boolean;
  super_chat_enabled: boolean;
  archive_enabled: boolean;
  delay: 'normal' | 'low' | 'ultra_low';
  scheduled_start_time?: string;
}

export interface LiveChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  message: string;
  is_super_chat: boolean;
  super_chat_amount?: number;
  timestamp: string;
}
```

## 必要なコンポーネント

### 新規作成
```
components/creation/
├── LiveStreamCard.tsx             # アップロードタブのカード
└── live/
    ├── LiveSettings.tsx           # 配信設定フォーム
    ├── LiveStats.tsx              # リアルタイム統計表示
    ├── LiveChat.tsx               # チャット表示
    └── StreamControls.tsx         # 配信コントロール
```

### 新規画面
```
app/
├── go-live.tsx                    # 配信設定画面
└── live/
    └── [streamId].tsx             # 配信中画面
```

## モックAPI拡張

### mockApi.ts に追加
```typescript
// ライブ配信作成
export const createLiveStream = async (data: LiveStreamCreate): Promise<LiveStream>

// ライブ配信開始
export const startLiveStream = async (streamId: string): Promise<void>

// ライブ配信終了
export const endLiveStream = async (streamId: string): Promise<void>

// ライブ配信取得
export const getLiveStreams = async (): Promise<LiveStream[]>

// ユーザーのライブ配信取得
export const getUserLiveStreams = async (): Promise<LiveStream[]>

// ライブ配信統計取得
export const getLiveStreamStats = async (streamId: string): Promise<LiveStreamStats>

// チャットメッセージ取得（モック用）
export const getLiveChatMessages = async (streamId: string): Promise<LiveChatMessage[]>
```

## 実装ステップ

1. **型定義追加**
   - `LiveStream`関連の型を追加

2. **アップロードタブにカード追加**
   - `LiveStreamCard`コンポーネント作成

3. **配信設定画面実装**
   - `app/go-live.tsx`作成
   - `LiveSettings`コンポーネント
   - フォーム入力・バリデーション

4. **配信中画面実装**
   - `app/live/[streamId].tsx`作成
   - `LiveStats`コンポーネント
   - `LiveChat`コンポーネント
   - `StreamControls`コンポーネント

5. **Contentsタブにライブ追加**
   - ライブタブ追加
   - ライブ配信一覧表示
   - ステータス表示（配信中/予定/終了）

6. **モックAPI実装**
   - ライブ配信CRUD操作
   - 統計情報取得
   - チャットメッセージ取得

7. **アーカイブ管理実装**
   - 配信終了後の自動アーカイブ
   - アーカイブ編集機能

---

## 全体の実装優先順位まとめ

### Phase 1: アナリティクス（1-2週間）
- 既存のタブ構造に統合しやすい
- DashboardやContentsと連携する
- グラフライブラリの導入が必要

### Phase 2: Netflix型コンテンツアップロード（2-3週間）
- 既存のNetflix視聴機能との整合性を取る
- シリーズ管理のUI/UXが複雑
- サブスクリプション設定の実装

### Phase 3: ライブ配信（3-4週間）
- 完全に新しい機能領域
- リアルタイム処理のシミュレーション
- チャット機能の実装

## 技術的考慮事項

### グラフライブラリ
- **react-native-chart-kit**: シンプルで使いやすい
- **Victory Native**: 高度なカスタマイズ可能
- **react-native-svg-charts**: SVGベース

### 状態管理
- 現在は各コンポーネントでローカル状態管理
- 複雑化する場合はContext APIやZustandの導入を検討

### パフォーマンス
- 大量のデータ表示時のページネーション
- グラフのレンダリング最適化
- 画像の遅延読み込み

## テスト計画

各Phase完了時に以下を確認:
1. モバイルでの表示・操作
2. デスクトップでの表示・操作
3. レスポンシブデザインの動作
4. エラーハンドリング
5. ローディング状態の表示
6. フォームバリデーション
