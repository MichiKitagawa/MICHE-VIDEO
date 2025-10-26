# プラットフォーム分離アーキテクチャ

## 目的

スマホアプリ（iOS/Android）では成人コンテンツを非表示にし、Webでは年齢確認後に表示できるようにする。

**背景:**
Apple/Googleのアプリストア審査ポリシーにより、成人コンテンツを含むアプリは承認されない。同じバックエンドとデータベースを共有しながら、フロントエンドだけで挙動を変える必要がある。

---

## 課題

### 単純なフロント制御では不十分

**NGパターン:**
```typescript
// フロント側のif分岐だけでは偽装可能
if (Platform.OS === 'web') {
  // 成人コンテンツを表示
} else {
  // 非表示
}
```

**問題点:**
- User-Agent偽装で回避可能
- アプリのバイナリを解析すればAPIエンドポイントが判明
- データベースクエリを直接実行すれば成人データを取得可能

### 必要な対策

サーバー側で**確実に制御**し、アプリからは成人データに一切アクセスできないようにする。

---

## 実装方針

### 全体フロー

```
┌─────────────────┐
│  アプリ起動     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ JWT発行リクエスト│
│ plat: 'app'     │ ← ビルド時に埋め込み
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ バックエンド（認証API）       │
│                             │
│ JWTペイロードに             │
│ { plat: 'app' } を付与      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ データベース（PostgreSQL）   │
│                             │
│ RLS (Row Level Security):   │
│ plat='app' なら             │
│ is_adult=false のみ取得可能 │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│ API応答         │
│ 成人データなし   │
└─────────────────┘
```

---

## 実装詳細

### 1. プラットフォーム識別子の付与

**JWT発行時にプラットフォーム情報を含める:**

```typescript
// backend/src/modules/auth/application/AuthService.ts

async login(email: string, password: string, platform: 'app' | 'web') {
  // ... 認証処理 ...

  const payload = {
    user_id: user.id,
    email: user.email,
    plat: platform  // ← プラットフォーム識別子
  };

  const accessToken = jwt.sign(payload, SECRET, { expiresIn: '15m' });

  return { accessToken, user };
}
```

**フロントエンドからのリクエスト:**

```typescript
// frontend/app/(tabs)/videos.tsx

// ビルド時に環境変数で設定
const PLATFORM = process.env.EXPO_PUBLIC_PLATFORM; // 'app' or 'web'

async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      platform: PLATFORM  // ← 'app' を送信
    })
  });

  return response.json();
}
```

### 2. データベースRLS (Row Level Security)

**PostgreSQL RLSポリシー:**

```sql
-- videos テーブルに対するRLSポリシー
CREATE POLICY "app_users_no_adult_content"
ON videos
FOR SELECT
USING (
  CASE
    WHEN current_setting('jwt.claims.plat', true) = 'app'
    THEN is_adult = false
    ELSE true
  END
);

-- shorts テーブルにも同様のポリシー
CREATE POLICY "app_users_no_adult_shorts"
ON shorts
FOR SELECT
USING (
  CASE
    WHEN current_setting('jwt.claims.plat', true) = 'app'
    THEN is_adult = false
    ELSE true
  END
);

-- netflix_contents テーブルにも同様のポリシー
CREATE POLICY "app_users_no_adult_netflix"
ON netflix_contents
FOR SELECT
USING (
  CASE
    WHEN current_setting('jwt.claims.plat', true) = 'app'
    THEN is_adult = false
    ELSE true
  END
);
```

**JWTクレームをPostgreSQLに設定:**

```typescript
// backend/src/infrastructure/database/prisma-client.ts

async function setJWTClaims(userId: string, platform: 'app' | 'web') {
  await prisma.$executeRaw`
    SET LOCAL jwt.claims.user_id = ${userId};
    SET LOCAL jwt.claims.plat = ${platform};
  `;
}
```

### 3. API側でのプラットフォーム検証

**成人コンテンツ関連のエンドポイントを拒否:**

```typescript
// backend/src/modules/video/interface/controllers/VideoController.ts

async getVideo(req: FastifyRequest, res: FastifyReply) {
  const { id } = req.params;
  const { plat } = req.user; // JWTから取得

  const video = await this.videoService.getVideoById(id);

  // アプリからの成人コンテンツアクセスを拒否
  if (plat === 'app' && video.is_adult) {
    return res.status(403).send({
      error: 'adult_content_not_available_on_app',
      message: 'このコンテンツはWebでのみ視聴可能です'
    });
  }

  return res.send(video);
}
```

### 4. フロントエンドUI制御

**ビルド時の環境変数設定:**

```bash
# .env.app (アプリビルド用)
EXPO_PUBLIC_PLATFORM=app

# .env.web (Webビルド用)
EXPO_PUBLIC_PLATFORM=web
```

**UI上での成人要素の非表示:**

```typescript
// frontend/components/VideoCard.tsx

const PLATFORM = process.env.EXPO_PUBLIC_PLATFORM;

export function VideoCard({ video }) {
  // アプリでは成人コンテンツを表示しない
  if (PLATFORM === 'app' && video.is_adult) {
    return null;
  }

  return (
    <View>
      <Image source={{ uri: video.thumbnail_url }} />
      <Text>{video.title}</Text>
      {/* 成人向けバッジはWebのみ */}
      {PLATFORM === 'web' && video.is_adult && (
        <Badge>18+</Badge>
      )}
    </View>
  );
}
```

### 5. APIキーの分離（オプション）

**プラットフォーム別にAPIキーを分ける:**

```typescript
// アプリ用APIキー（成人コンテンツアクセス不可）
const APP_API_KEY = 'app_xxxxxxxxxxxxx';

// Web用APIキー（全コンテンツアクセス可）
const WEB_API_KEY = 'web_xxxxxxxxxxxxx';
```

**バックエンド側の検証:**

```typescript
// backend/src/middleware/api-key-validator.ts

function validateApiKey(apiKey: string) {
  if (apiKey.startsWith('app_')) {
    return { platform: 'app', adultAllowed: false };
  } else if (apiKey.startsWith('web_')) {
    return { platform: 'web', adultAllowed: true };
  } else {
    throw new UnauthorizedException('Invalid API key');
  }
}
```

---

## セキュリティ検証

### 攻撃パターンと対策

| 攻撃パターン | 対策 |
|------------|------|
| User-Agent偽装 | ✅ JWTに`plat`クレームを付与、UA判定せず |
| アプリのバイナリ解析 | ✅ データベースRLSで確実に制御 |
| JWT改ざん | ✅ 署名検証（HMAC-SHA256/RS256） |
| 直接データベースアクセス | ✅ RLSポリシーで防御 |
| Web版JWTをアプリで使用 | ✅ APIキー分離で防御 |

### 多層防御

```
Layer 1: フロントエンドUI制御
  ↓ (回避可能)
Layer 2: API側のプラットフォーム検証
  ↓ (回避可能)
Layer 3: データベースRLS（最終防衛ライン）
  ✅ 絶対に回避不可
```

---

## 動作確認

### アプリからのアクセス（成人コンテンツ非表示）

```bash
# 1. アプリとしてログイン
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "platform": "app"
}

# 2. 動画一覧取得
GET /api/videos
Authorization: Bearer {app_token}

# レスポンス: is_adult=false の動画のみ
{
  "videos": [
    { "id": "vid_1", "title": "通常動画", "is_adult": false },
    // is_adult=true の動画は含まれない
  ]
}

# 3. 成人コンテンツに直接アクセス
GET /api/videos/vid_adult_xxx
Authorization: Bearer {app_token}

# レスポンス: 403 Forbidden
{
  "error": "adult_content_not_available_on_app"
}
```

### Webからのアクセス（成人コンテンツ表示）

```bash
# 1. Webとしてログイン
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "platform": "web"
}

# 2. 動画一覧取得
GET /api/videos
Authorization: Bearer {web_token}

# レスポンス: すべての動画（成人含む）
{
  "videos": [
    { "id": "vid_1", "title": "通常動画", "is_adult": false },
    { "id": "vid_2", "title": "成人動画", "is_adult": true }
  ]
}

# 3. 成人コンテンツに直接アクセス
GET /api/videos/vid_adult_xxx
Authorization: Bearer {web_token}

# レスポンス: 200 OK
{
  "id": "vid_adult_xxx",
  "title": "成人動画",
  "is_adult": true,
  ...
}
```

---

## ビルド設定

### Expo アプリビルド

```bash
# iOS/Android用ビルド
EXPO_PUBLIC_PLATFORM=app eas build --platform all
```

**eas.json:**
```json
{
  "build": {
    "app": {
      "env": {
        "EXPO_PUBLIC_PLATFORM": "app"
      }
    },
    "web": {
      "env": {
        "EXPO_PUBLIC_PLATFORM": "web"
      }
    }
  }
}
```

### Web版ビルド

```bash
# Web用ビルド
EXPO_PUBLIC_PLATFORM=web npx expo export:web
```

---

## モニタリング

### 監視項目

1. **成人コンテンツアクセス試行**
   - アプリからの403エラーを記録
   - 異常なアクセスパターンを検出

2. **プラットフォーム識別の正確性**
   - `plat='app'` で成人データが取得されていないか監査

3. **API使用率**
   - アプリ vs Web のトラフィック比率

---

## 結果

**バックエンドは共通のまま:**
- ✅ スマホアプリでは成人データを**絶対に**取得できない
- ✅ Webでは成人データも表示可能
- ✅ Apple/Google審査を通過可能
- ✅ 同じデータベース・APIを共有できる

**実装コストが低い:**
- データベースを分ける必要なし
- APIを2つ用意する必要なし
- RLSポリシーとJWTクレームだけで実現
