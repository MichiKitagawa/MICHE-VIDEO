# MICHE VIDEO フロントエンド

YouTubeライクな動画プラットフォームのフロントエンド実装（モックデータ版）

## 技術スタック

- **Expo** (React Native) - iOS/Android/Web対応
- **Expo Router** - ファイルベースルーティング
- **TypeScript**
- **expo-av** - 動画再生
- **expo-image-picker** - 動画選択

## 開発環境のセットアップ

### 必要な環境

- Node.js 18以上
- npm

### インストール

```bash
cd frontend
npm install
```

## 起動方法

### Web版（localhost:3000）

```bash
npm run web
```

ブラウザで http://localhost:3000 にアクセス

### iOS（要：Mac + Xcode）

```bash
npm run ios
```

### Android（要：Android Studio）

```bash
npm run android
```

## 画面構成

1. **ホーム** (`app/(tabs)/index.tsx`)
   - 動画一覧をYouTubeライクに表示
   - プラットフォーム別の成人コンテンツフィルタ

2. **動画視聴** (`app/video/[id].tsx`)
   - 動画プレーヤー
   - 動画情報（タイトル、説明文、視聴数など）
   - IP情報表示

3. **アップロード** (`app/(tabs)/upload.tsx`)
   - 動画選択
   - タイトル・説明文入力
   - IP選択
   - 成人向けフラグ

4. **認証** (`app/auth.tsx`)
   - ログイン/サインアップ

5. **ライブラリ** (`app/(tabs)/profile.tsx`)
   - プレースホルダー（後で実装）

## ディレクトリ構造

```
frontend/
├── app/                    # Expo Router (画面)
│   ├── (tabs)/            # タブナビゲーション
│   │   ├── index.tsx      # ホーム
│   │   ├── upload.tsx     # アップロード
│   │   └── profile.tsx    # ライブラリ
│   ├── video/[id].tsx     # 動画視聴
│   └── auth.tsx           # 認証
├── components/            # 共通コンポーネント
│   ├── Header.tsx
│   ├── VideoCard.tsx
│   └── VideoPlayer.tsx
├── constants/             # 定数
│   ├── Colors.ts          # YouTubeライクな色定義
│   └── Platform.ts        # プラットフォーム判定
├── types/                 # 型定義
│   └── index.ts
├── utils/                 # ユーティリティ
│   └── mockApi.ts         # モックAPI
└── mock/                  # モックデータ
    ├── videos.json
    ├── video-detail.json
    ├── ip-licenses.json
    └── user.json
```

## デザイン

- **YouTubeのスマホアプリとまるっきり同じUI**
- スマホ優先、PCもレスポンシブ対応
- 色：YouTubeの青（#065FD4）、グレー系

## プラットフォーム別の動作

### App版（iOS/Android）
- 成人向けコンテンツ（`is_adult: true`）は完全非表示
- ボトムナビゲーション使用

### Web版
- 成人向けコンテンツも表示
- 動画カードに赤い「18+」バッジ表示

## モックデータ

現在はバックエンドなしで動作するため、`mock/`ディレクトリのJSONファイルをデータソースとして使用。

- `videos.json` - 動画一覧（10件、うち2件が成人向け）
- `video-detail.json` - 動画詳細（1件、IPライセンス付き）
- `ip-licenses.json` - IPライセンス一覧（5件）
- `user.json` - モックユーザー情報

## 次のステップ（バックエンド実装後）

1. `utils/mockApi.ts` を実APIに置き換え
2. 認証機能の実装（Supabase Auth連携）
3. 実際の動画アップロード機能
4. ライブラリ画面の実装
5. 検索機能
6. コメント・いいね機能

## ポート設定

- Web: **localhost:3000**
- Backend（将来）: **localhost:3001**
