# ボトムナビゲーション再設計ドキュメント

## 目的

### 何がしたいか

**複数の動画コンテンツ消費体験を1つのアプリで提供する統合プラットフォーム**

MICHE VIDEOは、異なる動画コンテンツ消費のニーズに対応するため、3つの異なるUIパラダイムを提供します：

1. **ショート動画体験（TikTok/YouTube Shorts型）**
   - 短尺・縦型動画に特化
   - 没入型の全画面視聴体験
   - 縦スクロールでの連続視聴
   - ユーザー生成コンテンツ（UGC）中心

2. **通常動画体験（YouTube型）**
   - あらゆる長さの横型動画
   - グリッド/リスト表示で探索しやすい
   - 検索・カテゴリー・おすすめ機能
   - 個人クリエイター・企業コンテンツ

3. **長編コンテンツ体験（Netflix型）**
   - 映画・ドラマ・シリーズもの
   - カルーセル型の横スクロールUI
   - エピソード管理・シーズン管理
   - 視聴履歴・続きから再生
   - プロフェッショナルコンテンツ中心

### なぜこの設計が必要か

- **ユーザーの視聴モードに応じた最適なUI**：暇つぶしのショート視聴、学習目的の動画検索、じっくり楽しむ長編視聴など、異なるニーズに対応
- **IPライセンスビジネスとの親和性**：Netflix型で長編作品、動画でメイキング、ショートでプロモーションなど、1つのIPを多角的に展開
- **競合との差別化**：YouTube、TikTok、Netflixの機能を統合した唯一無二のプラットフォーム
- **クリーンなUX**：アップロード機能を設定に隠蔽し、視聴体験に集中できるナビゲーション

---

## 新しいボトムナビゲーション構成

### 4タブ構成

| タブ名 | アイコン | 機能 | UIパラダイム |
|--------|----------|------|--------------|
| **ショート** | `play-outline` | 短尺縦型動画の視聴 | YouTube Shorts風（全画面縦スクロール） |
| **動画** | `videocam-outline` | 通常動画の検索・視聴 | YouTube風（グリッド表示・検索バー） |
| **Netflix** | `film-outline` | 長編コンテンツ視聴 | Netflix風（カルーセル・シリーズ管理） |
| **設定** | `settings-outline` | プロフィール・アップロード | 設定・管理画面 |

---

## 各タブの詳細仕様

### 1. ショートタブ（既存）

**特徴：**
- 全画面縦型動画プレーヤー
- 縦スクロールでの連続視聴（FlatList with paging）
- 右側にアクションボタン（いいね、コメント、シェア）
- 60秒以下の短尺動画推奨

**変更点：**
- なし（既存の実装を維持）

**ファイル：**
- `app/(tabs)/shorts.tsx`
- `components/ShortVideoPlayer.tsx`
- `mock/shorts.json`

---

### 2. 動画タブ（新規作成）

**特徴：**
- YouTubeのホーム画面風のレイアウト
- 検索バー（ヘッダー内）
- 動画サムネイルのグリッド表示
- 動画カード：サムネイル、タイトル、チャンネル名、再生数、投稿日時
- カテゴリーフィルター（任意）
- おすすめ・人気・新着などのタブ

**UIコンポーネント：**
```
<ScrollView>
  <SearchBar />
  <CategoryTabs />
  <VideoGrid>
    {videos.map(video => (
      <VideoCard
        thumbnail={...}
        title={...}
        channel={...}
        views={...}
        onPress={() => router.push(`/video/${id}`)}
      />
    ))}
  </VideoGrid>
</ScrollView>
```

**必要なファイル：**
- `app/(tabs)/videos.tsx`（新規）
- `components/VideoCard.tsx`（新規）
- `mock/videos.json`（既存を流用）

---

### 3. Netflixタブ（新規作成）

**特徴：**
- Netflix風の横スクロールカルーセル
- 複数のカテゴリー行（「おすすめ」「最近追加」「人気の映画」「ドラマシリーズ」など）
- 大きなヒーローバナー（トップに注目作品）
- シリーズ・エピソード管理
- 続きから再生機能

**UIコンポーネント：**
```
<ScrollView>
  <HeroBanner featuredContent={...} />

  <CategoryRow title="おすすめ">
    <HorizontalScrollView>
      {contents.map(content => (
        <ContentCard
          poster={...}
          title={...}
          type="movie|series"
        />
      ))}
    </HorizontalScrollView>
  </CategoryRow>

  <CategoryRow title="人気のシリーズ">
    ...
  </CategoryRow>
</ScrollView>
```

**データ構造（新規型定義）：**
```typescript
interface NetflixContent {
  id: string;
  title: string;
  type: 'movie' | 'series';
  poster_url: string;
  backdrop_url: string;
  description: string;
  release_year: number;
  duration?: number; // 映画の場合（分）
  seasons?: Season[]; // シリーズの場合
  genres: string[];
  rating: number;
  is_adult: boolean;
}

interface Season {
  season_number: number;
  episodes: Episode[];
}

interface Episode {
  episode_number: number;
  title: string;
  description: string;
  duration: number;
  video_url: string;
  thumbnail_url: string;
}
```

**必要なファイル：**
- `app/(tabs)/netflix.tsx`（新規）
- `components/HeroBanner.tsx`（新規）
- `components/CategoryRow.tsx`（新規）
- `components/ContentCard.tsx`（新規）
- `mock/netflix-contents.json`（新規）
- `types/index.ts`（型定義追加）

---

### 4. 設定タブ（修正）

**変更点：**
- **アップロード機能を統合**
- 左サイドバーに「アップロード」タブを追加

**新しい左サイドバー構成：**
```
- プロフィール
- サブスクリプション
- アップロード ← 新規追加
  - 動画をアップロード
  - ショートをアップロード
```

**アップロードタブの内容：**
- 投稿タイプ選択画面（既存の `post.tsx` の内容を移植）
- 通常動画とショートの選択カード
- クリックで各アップロード画面へ遷移

**必要な修正：**
- `app/(tabs)/settings.tsx`（サイドバーにアップロードタブ追加）
- `app/(tabs)/post.tsx`を削除（機能を settings に統合）
- `app/upload-video.tsx`と`app/upload-short.tsx`は維持

---

## 実装手順

### Phase 1: ボトムナビゲーション変更
1. `app/(tabs)/_layout.tsx` を修正
   - タブを4つに変更：shorts, videos, netflix, settings
   - `post` タブを削除
2. タブのアイコンとラベルを更新

### Phase 2: 動画タブ作成
1. `app/(tabs)/videos.tsx` 作成
   - 既存の `app/(tabs)/index.tsx`（ホーム画面）をベースに
   - YouTube風のレイアウト
2. `components/VideoCard.tsx` 作成
3. 検索機能の実装

### Phase 3: Netflixタブ作成
1. 型定義追加 `types/index.ts`
   - `NetflixContent`, `Season`, `Episode`
2. モックデータ作成 `mock/netflix-contents.json`
3. `app/(tabs)/netflix.tsx` 作成
4. カルーセルコンポーネント作成
   - `components/HeroBanner.tsx`
   - `components/CategoryRow.tsx`
   - `components/ContentCard.tsx`

### Phase 4: 設定タブ修正
1. `app/(tabs)/settings.tsx` 修正
   - 左サイドバーに「アップロード」タブ追加
   - タブ選択時に投稿タイプ選択画面を表示
2. `app/(tabs)/post.tsx` 削除

### Phase 5: クリーンアップ
1. 不要なファイルの削除
2. ルーティングの確認
3. 動作確認

---

## ファイル構造（変更後）

```
app/
├── (tabs)/
│   ├── _layout.tsx          # 修正：4タブ構成に変更
│   ├── shorts.tsx           # 既存：ショートタブ
│   ├── videos.tsx           # 新規：動画タブ（YouTube風）
│   ├── netflix.tsx          # 新規：Netflixタブ
│   └── settings.tsx         # 修正：アップロード機能を統合
├── upload-video.tsx         # 既存：通常動画アップロード画面
├── upload-short.tsx         # 既存：ショート動画アップロード画面
└── video/
    └── [id].tsx             # 既存：動画詳細画面

components/
├── Header.tsx               # 既存
├── ShortVideoPlayer.tsx     # 既存
├── VideoCard.tsx            # 新規：動画カード
├── HeroBanner.tsx           # 新規：Netflixヒーローバナー
├── CategoryRow.tsx          # 新規：Netflixカテゴリー行
└── ContentCard.tsx          # 新規：Netflixコンテンツカード

mock/
├── videos.json              # 既存
├── shorts.json              # 既存
├── netflix-contents.json    # 新規：Netflix型コンテンツ
└── subscriptions.json       # 既存

types/
└── index.ts                 # 修正：Netflix型定義追加
```

---

## UI/UXの違い（まとめ）

| 項目 | ショート | 動画 | Netflix |
|------|----------|------|---------|
| **レイアウト** | 全画面縦 | グリッド | カルーセル横スクロール |
| **スクロール** | 縦（ページング） | 縦（無限スクロール） | 縦＋横 |
| **サムネイル** | なし（全画面） | 横型16:9 | 縦型ポスター |
| **動画形式** | 縦型9:16 | 横型16:9 | 横型16:9 |
| **コンテンツ長** | 〜60秒 | 1分〜2時間 | 20分〜3時間 |
| **検索** | なし | あり | カテゴリーブラウズ |
| **操作** | タップで再生/停止 | カードタップで詳細 | カードタップで詳細 |
| **情報表示** | 最小限 | タイトル・チャンネル・再生数 | タイトル・説明・評価 |

---

## 期待される効果

1. **ユーザー体験の向上**
   - 視聴目的に応じた最適なUIを提供
   - 迷わない直感的なナビゲーション

2. **コンテンツの多様化**
   - 短尺UGCから長編プロフェッショナルコンテンツまで対応
   - IPライセンスビジネスとの親和性

3. **競合優位性**
   - YouTube + TikTok + Netflixの統合プラットフォーム
   - 1つのアプリで完結する動画視聴体験

4. **収益機会の拡大**
   - 広告（ショート・動画）
   - サブスクリプション（Netflix型プレミアムコンテンツ）
   - IPライセンス収益

---

## 技術的考慮事項

### パフォーマンス
- Netflix型カルーセルは `FlatList` の `horizontal` プロップを使用
- 画像の遅延読み込み（Lazy Loading）
- 動画サムネイルの最適化

### データ構造
- コンテンツタイプ（short/video/netflix）で共通フィールドと固有フィールドを分離
- 柔軟なフィルタリング・ソート機能

### 将来の拡張性
- ライブ配信タブの追加可能性
- プレイリスト・チャンネル機能
- ソーシャル機能（コメント、共有、フォロー）
