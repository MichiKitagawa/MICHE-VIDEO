# Issue: Netflix コンテンツ再生機能の実装

## 📋 概要

Netflixタブのコンテンツをクリックした際、現在はAlertが表示されるだけで何も起こらない。
実際に動画再生まで行けるよう、必要なページとコンポーネントを実装する。

## 🎯 目標

1. Netflixコンテンツをクリック → 詳細・再生ページへ遷移
2. 映画の場合：そのまま再生開始
3. シリーズの場合：シーズン・エピソード選択 → 再生

## 📊 現状分析

### 現在の実装状態

**netflix.tsx (app/(tabs)/netflix.tsx:42-54)**
```typescript
const handleContentPress = (content: NetflixContent) => {
  // 詳細画面へ遷移（今後実装）
  Alert.alert(content.title, content.description);
};

const handlePlay = (content: NetflixContent) => {
  // 再生画面へ遷移
  if (content.type === 'movie') {
    Alert.alert('再生', `「${content.title}」を再生します（モック）`);
  } else {
    Alert.alert('シリーズ', `「${content.title}」のエピソードを選択してください（モック）`);
  }
};
```

### NetflixContent型定義 (types/index.ts:86-114)

```typescript
export interface NetflixContent {
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
  country: string;
}

export interface Season {
  season_number: number;
  episodes: Episode[];
}

export interface Episode {
  episode_number: number;
  title: string;
  description: string;
  duration: number;
  video_url: string; // ✅ episodeにはvideo_urlがある
  thumbnail_url: string;
}
```

### 問題点

1. ❌ **NetflixContentにvideo_urlがない**
   - movieタイプの場合、直接再生するためのURLが必要
   - 現在はepisodeにしかvideo_urlがない

2. ❌ **Netflix専用の詳細・再生ページが存在しない**
   - /app/netflix/[id].tsx が必要
   - 参考: /app/video/[id].tsx (YouTube用)

3. ❌ **エピソード選択UIが存在しない**
   - シリーズの場合、シーズン・エピソード選択が必要

## 🛠️ 実装計画

### Phase 1: 型定義の拡張

**ファイル**: `types/index.ts`

```typescript
export interface NetflixContent {
  id: string;
  title: string;
  type: 'movie' | 'series';
  poster_url: string;
  backdrop_url: string;
  description: string;
  release_year: number;
  duration?: number;
  video_url?: string; // ✨ 追加: 映画の場合の動画URL
  seasons?: Season[];
  genres: string[];
  rating: number;
  is_adult: boolean;
  country: string;
}
```

### Phase 2: モックデータの更新

**ファイル**: `mock/netflix-contents.json`

映画タイプのコンテンツに `video_url` を追加：

```json
{
  "id": "1",
  "title": "未来への旅立ち",
  "type": "movie",
  "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  ...
}
```

### Phase 3: Netflix詳細・再生ページの作成

**新規ファイル**: `app/netflix/[id].tsx`

**機能**:
- 動的ルーティングでコンテンツIDを取得
- getNetflixContentDetail APIでデータ取得
- movieとseriesで表示を分岐

**レイアウト構成**:

#### 映画の場合
```
┌─────────────────────────────┐
│   NetflixVideoPlayer        │ ← 動画プレーヤー
├─────────────────────────────┤
│ タイトル・評価・年度         │
│ 説明文                       │
│ ジャンル・制作国             │
└─────────────────────────────┘
```

#### シリーズの場合
```
┌─────────────────────────────┐
│   バックドロップ画像         │
├─────────────────────────────┤
│ タイトル・評価・年度         │
│ 説明文                       │
│ ジャンル・制作国             │
├─────────────────────────────┤
│ シーズン選択タブ             │ ← Season 1 | Season 2 | ...
│                             │
│ エピソード一覧               │
│ ┌─────────────────────┐     │
│ │ Ep1 サムネイル      │     │
│ │ タイトル            │     │
│ │ 説明 | 45分         │     │
│ └─────────────────────┘     │
│ ┌─────────────────────┐     │
│ │ Ep2 サムネイル      │     │
│ └─────────────────────┘     │
└─────────────────────────────┘
```

**エピソードクリック時**:
- 同じページ内で動画プレーヤーを上部に表示
- 再生中のエピソード情報をハイライト

### Phase 4: NetflixVideoPlayerコンポーネント

**新規ファイル**: `components/NetflixVideoPlayer.tsx`

**機能**:
- expo-avのVideoコンポーネントを使用
- 再生/一時停止、シーク、音量調整
- フルスクリーン対応
- 字幕対応（将来的に）

**参考**: `components/VideoPlayer.tsx` (YouTube用)

### Phase 5: エピソード選択UI

**新規コンポーネント**: `components/SeasonEpisodeSelector.tsx`

**機能**:
- シーズンタブ切り替え
- エピソード一覧表示（サムネイル、タイトル、説明、再生時間）
- 視聴済みマーク（進捗バー）
- エピソードクリック → 動画再生

### Phase 6: API関数の追加

**ファイル**: `utils/mockApi.ts`

```typescript
// Netflix コンテンツ詳細を取得
export const getNetflixContentDetail = async (id: string): Promise<NetflixContent> => {
  await delay(500);
  const contents = await getNetflixContents();
  const content = contents.find(c => c.id === id);
  if (!content) {
    throw new Error('Content not found');
  }
  return content;
};
```

### Phase 7: ルーティング修正

**ファイル**: `app/(tabs)/netflix.tsx`

```typescript
const handleContentPress = (content: NetflixContent) => {
  router.push(`/netflix/${content.id}`);
};

const handlePlay = (content: NetflixContent) => {
  router.push(`/netflix/${content.id}`);
};
```

## 📐 画面設計

### Netflix詳細・再生ページ

#### 共通ヘッダー
- 戻るボタン（左上）
- タイトル
- お気に入りボタン（右上）

#### 映画レイアウト
1. **動画プレーヤーエリア** (16:9)
2. **情報エリア**
   - タイトル（H1）
   - 評価 ⭐ 4.5 | 2023年 | 2時間15分
   - 再生ボタン / マイリスト追加
   - 説明文（折りたたみ可能）
   - ジャンル: アクション, SF
   - 制作国: JP

#### シリーズレイアウト
1. **バックドロップ画像**
2. **情報エリア** (映画と同様)
3. **シーズンタブ**
   - Season 1 | Season 2 | Season 3
4. **エピソード一覧**
   - 各エピソードカード:
     - サムネイル (120x90)
     - Ep.1 タイトル
     - 説明（1-2行）
     - 45分 | 視聴済み80%

## 🎨 レスポンシブ対応

### モバイル (< 768px)
- 動画プレーヤー: 全幅
- 情報: 単一カラム
- エピソード: 縦スタック

### タブレット (768px - 1024px)
- 動画プレーヤー: 全幅
- 情報: 単一カラム
- エピソード: 縦スタック（少し大きめ）

### デスクトップ (≥ 1024px)
- 動画プレーヤー: 最大幅1200px、中央配置
- 情報: 2カラム可能
- エピソード: グリッド表示も検討

## ✅ 完了条件

- [ ] NetflixContent型にvideo_url追加
- [ ] モックデータにvideo_url追加
- [ ] /app/netflix/[id].tsx 作成
- [ ] NetflixVideoPlayerコンポーネント作成
- [ ] SeasonEpisodeSelectorコンポーネント作成
- [ ] getNetflixContentDetail API関数追加
- [ ] netflix.tsxのルーティング修正
- [ ] 映画タイプの再生動作確認
- [ ] シリーズタイプのエピソード選択・再生動作確認
- [ ] レスポンシブ表示確認

## 🔄 フロー図

```
[Netflixタブ]
     ↓ コンテンツクリック
[/netflix/[id]]
     ↓
   movie? ┌─── Yes → 動画プレーヤー表示 → 即座に再生可能
          │
          └─── No (series) → バックドロップ画像表示
                              ↓
                        シーズン・エピソード一覧
                              ↓ エピソードクリック
                        動画プレーヤー表示・再生
```

## 📚 参考実装

- **YouTube動画詳細**: `app/video/[id].tsx`
- **VideoPlayerコンポーネント**: `components/VideoPlayer.tsx`
- **Shortsプレーヤー**: `components/ShortVideoPlayer.tsx`

## 🚀 優先順位

1. **High**: 型定義拡張、モックデータ更新
2. **High**: Netflix詳細ページ作成（基本レイアウト）
3. **High**: 映画タイプの再生機能
4. **Medium**: エピソード選択UI
5. **Medium**: シリーズタイプの再生機能
6. **Low**: 視聴進捗保存、字幕機能

## 📝 備考

- 動画URLはサンプル動画を使用（Big Buck Bunnyなど）
- 視聴履歴への記録は後のフェーズで実装
- 次回再生位置の記憶も将来的に実装
