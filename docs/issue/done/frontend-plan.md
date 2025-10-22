# MICHE VIDEO フロントエンド実装計画

## フェーズ1: プロジェクトセットアップ

### 1.1 Expoプロジェクト初期化
- ディレクトリ：`/Users/michikitagawa/Projects/Video/frontend`
- `npx create-expo-app@latest frontend --template blank-typescript`
- ローカル開発：localhost:3000（Web）で起動
- 必要なパッケージのインストール

### 1.2 必要なパッケージ
```bash
# Expo Router（ファイルベースルーティング）
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# 動画再生
npx expo install expo-av

# 動画選択
npx expo install expo-image-picker

# アイコン（デフォルトで入ってる）
@expo/vector-icons
```

### 1.3 ポート設定
`package.json` に追加：
```json
"scripts": {
  "start": "expo start",
  "web": "expo start --web --port 3000",
  "android": "expo start --android",
  "ios": "expo start --ios"
}
```

`.env` または設定ファイルで：
```
EXPO_DEVTOOLS_LISTEN_ADDRESS=localhost
REACT_NATIVE_PACKAGER_HOSTNAME=localhost
```

### 1.4 ディレクトリ構造
```
/Users/michikitagawa/Projects/Video/
├── frontend/              # フロントエンド（localhost:3000）
│   ├── app/               # Expo Router
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      # ホーム
│   │   │   ├── upload.tsx     # アップロード
│   │   │   └── profile.tsx    # プロフィール
│   │   ├── video/[id].tsx     # 動画視聴
│   │   └── auth.tsx           # 認証
│   ├── components/        # 共通コンポーネント
│   │   ├── Header.tsx
│   │   ├── VideoCard.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── BottomNav.tsx
│   ├── mock/              # モックデータ
│   │   ├── videos.json
│   │   ├── video-detail.json
│   │   ├── ip-licenses.json
│   │   └── user.json
│   ├── types/             # 型定義
│   │   └── index.ts
│   ├── constants/         # 定数
│   │   ├── Colors.ts      # YouTubeライクな色定義
│   │   └── Platform.ts
│   ├── utils/             # ユーティリティ
│   │   └── mockApi.ts
│   ├── package.json
│   └── app.json           # Expo設定（ポート3000に設定）
└── backend/               # バックエンド（localhost:3001、将来）
```

---

## フェーズ2: 基礎設定

### 2.1 型定義作成（types/index.ts）
```ts
export interface Video {
  id: string
  title: string
  thumbnail_url: string
  user_name: string
  view_count: number
  created_at: string
  is_adult: boolean
}

export interface VideoDetail extends Video {
  description: string
  video_url: string
  user_avatar: string
  ip_license: IPLicense | null
}

export interface IPLicense {
  id: string
  name: string
  thumbnail: string
  license_type: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar_url: string
}
```

### 2.2 モックデータ作成
- `mock/videos.json` - 10件程度の動画データ
- `mock/video-detail.json` - 1件の詳細データ
- `mock/ip-licenses.json` - 5件程度のIPデータ
- `mock/user.json` - ログインユーザー情報

### 2.3 プラットフォーム判定
- `constants/Platform.ts` で app/web 判定
- 環境変数 `EXPO_PLATFORM` を読み取る

### 2.4 モックAPI作成
- `utils/mockApi.ts` で各種データ取得関数
- `getVideos()`, `getVideoDetail(id)`, `getIPLicenses()` など

---

## フェーズ3: 共通コンポーネント実装

### 3.1 Header
- ロゴ表示
- ログイン/プロフィールアイコン
- シンプルなスタイリング

### 3.2 VideoCard（YouTubeライク）
- 横長レイアウト：サムネイル（左）＋情報（右）
- サムネイル：16:9、120x68px
- タイトル：太字、2行まで、...で省略
- チャンネル名、視聴数、日時：グレー、小さめ
- 成人向けバッジ（web版のみ、赤い18+）
- メニューアイコン（⋮）右端
- タップで動画視聴ページへ遷移

### 3.3 BottomNav（スマホのみ）
- ホーム、アップロード、プロフィールアイコン
- 選択状態の表示

---

## フェーズ4: 画面実装

### 4.1 動画一覧ページ（ホーム）
- Headerコンポーネント配置
- FlatListで動画カード表示
- モックデータから読み込み
- プラットフォーム判定で成人向けフィルタ

### 4.2 動画視聴ページ
- Video コンポーネントで動画再生
- 動画情報表示
- IP情報表示（あれば）
- 視聴数カウント（モックなので実際はカウントしない）

### 4.3 動画アップロードページ
- ImagePicker で動画選択
- フォーム入力（タイトル、説明文）
- IP選択（モーダルまたはドロップダウン）
- 成人向けフラグ
- アップロードボタン（モックなのでアラート表示程度）

### 4.4 認証ページ
- ログイン/サインアップのタブ切り替え
- フォーム入力
- ボタンタップでモックログイン（ユーザー情報を状態管理に保存）

---

## フェーズ5: ナビゲーション設定

### 5.1 Expo Router設定
- `app/(tabs)` でボトムタブ
- `app/video/[id]` で動画詳細
- `app/auth` で認証

### 5.2 認証ガード
- アップロードページはログイン必須
- 未ログインの場合は `/auth` へリダイレクト

---

## フェーズ6: スタイリング

### 6.1 デザイン方針
- シンプルなYouTubeライク
- ダークモード対応は後回し
- レスポンシブ対応（スマホ/タブレット/Web）

### 6.2 色（YouTubeライク）
```ts
// constants/Colors.ts
const colors = {
  background: '#FFFFFF',
  text: '#0F0F0F',           // ほぼ黒
  textSecondary: '#606060',   // グレー
  border: '#E5E5E5',

  primary: '#065FD4',         // YouTubeの青
  active: '#000000',          // 選択中
  inactive: '#909090',        // 非選択

  adult: '#FF0000',           // 赤（18+）
}
```

---

## フェーズ7: 動作確認

### 7.1 スマホアプリ確認
- Expo Go で iOS/Android 確認
- 成人向けコンテンツが非表示になっているか
- ボトムナビゲーションが機能するか

### 7.2 Web版確認
- `npx expo start --web` で Web 確認
- 成人向けコンテンツが表示されるか
- レスポンシブデザインの確認

---

## 実装順序

1. **セットアップ**（フェーズ1-2）
   - プロジェクト作成：`/Users/michikitagawa/Projects/Video/frontend`
   - パッケージインストール
   - ポート3000に設定
   - 型定義、モックデータ作成

2. **共通コンポーネント**（フェーズ3）
   - Header, VideoCard, BottomNav

3. **画面実装**（フェーズ4）
   - ホーム → 動画視聴 → 認証 → アップロード の順

4. **ナビゲーション**（フェーズ5）
   - Expo Router設定、認証ガード

5. **スタイリング調整**（フェーズ6）
   - 全体の見た目を整える（YouTubeライク）

6. **動作確認**（フェーズ7）
   - App/Web両方で確認（localhost:3000でWeb版起動）

---

## 所要時間見積もり（目安）
- フェーズ1-2: 1-2時間
- フェーズ3: 2-3時間
- フェーズ4: 4-6時間
- フェーズ5: 1-2時間
- フェーズ6: 2-3時間
- フェーズ7: 1時間

**合計: 11-17時間程度**

---

**まずは動くものを作る。細かい調整は後で。**
