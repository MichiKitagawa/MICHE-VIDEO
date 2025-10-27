# セキュリティアーキテクチャ仕様書

## 1. 概要

本ドキュメントでは、動画配信プラットフォームにおけるセキュリティアーキテクチャ、認証・認可、データ暗号化、脆弱性対策、監査ログ、およびコンプライアンス要件について詳述する。

### 1.1 セキュリティ目標

- **機密性**: ユーザーデータ、決済情報の保護
- **完全性**: データ改ざん防止
- **可用性**: DDoS攻撃からの保護
- **認証**: 強固なユーザー認証
- **認可**: 適切なアクセス制御
- **監査**: 全操作の記録とトレーサビリティ

---

## 2. 認証アーキテクチャ

### 2.1 JWT認証フロー

```
┌──────────┐                 ┌───────────┐                ┌──────────┐
│  Client  │                 │ API Server│                │ Database │
└────┬─────┘                 └─────┬─────┘                └────┬─────┘
     │                             │                           │
     │ 1. POST /api/auth/login     │                           │
     │ {email, password}           │                           │
     ├────────────────────────────>│                           │
     │                             │ 2. SELECT user            │
     │                             ├──────────────────────────>│
     │                             │<──────────────────────────┤
     │                             │ 3. bcrypt.compare()       │
     │                             │    (password verification)│
     │                             │                           │
     │                             │ 4. jwt.sign()             │
     │                             │    (token generation)     │
     │                             │                           │
     │ 5. {accessToken,            │                           │
     │     refreshToken}           │                           │
     │<────────────────────────────┤                           │
     │                             │                           │
     │ 6. GET /api/videos/my-videos│                           │
     │    Authorization: Bearer    │                           │
     │    {accessToken}            │                           │
     ├────────────────────────────>│                           │
     │                             │ 7. jwt.verify()           │
     │                             │    (token validation)     │
     │                             │                           │
     │                             │ 8. SELECT videos          │
     │                             ├──────────────────────────>│
     │                             │<──────────────────────────┤
     │ 9. {videos: [...]}          │                           │
     │<────────────────────────────┤                           │
```

### 2.2 JWT構造

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "sub": "usr_abc123",
  "email": "user@example.com",
  "name": "田中太郎",
  "role": "user",
  "plat": "general",
  "plan_id": "plan_premium",
  "has_adult_access": false,
  "iat": 1730000000,
  "exp": 1730086400
}
```

**Platform Claim (`plat`)**:
- `"general"`: General content platform (default)
- `"adult"`: Adult content platform (Premium+ plan only)
- **Required for RLS enforcement**: This claim is used in PostgreSQL Row Level Security policies to isolate adult content

**Signature**:
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  SECRET_KEY
)
```

### 2.3 認証ミドルウェア実装（Fastify）

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  plat: 'general' | 'adult';  // Platform claim - REQUIRED for RLS
  plan_id: string;
  has_adult_access: boolean;
}

// Extend Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

// Fastify auth hook
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.status(401).send({
      error: 'auth_required',
      message: '認証が必要です',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Verify plat claim exists (required for RLS)
    if (!decoded.plat || !['general', 'adult'].includes(decoded.plat)) {
      return reply.status(401).send({
        error: 'invalid_token',
        message: 'Platform claim is missing or invalid',
      });
    }

    // Add JWT payload to request
    request.user = decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return reply.status(401).send({
        error: 'token_expired',
        message: 'トークンの有効期限が切れました',
      });
    }

    return reply.status(401).send({
      error: 'invalid_token',
      message: 'トークンが無効です',
    });
  }
}

// Register as preHandler hook in Fastify:
// app.addHook('preHandler', requireAuth);
// Or use on specific routes:
// app.get('/api/protected', { preHandler: requireAuth }, handler);

// ロールベースアクセス制御 (Fastify)
export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'auth_required' });
    }

    if (request.user.role !== role && request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'insufficient_permissions',
        message: 'この操作を実行する権限がありません',
        details: {
          required_role: role,
          current_role: request.user.role,
        },
      });
    }
  };
}

// サブスクプランチェック (Fastify)
export function requirePlan(minPlan: string) {
  const planHierarchy: Record<string, number> = {
    free: 0,
    premium: 1,
    premium_plus: 2
  };

  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'auth_required' });
    }

    const userPlanLevel = planHierarchy[request.user.plan_id];
    const requiredLevel = planHierarchy[minPlan];

    if (userPlanLevel < requiredLevel) {
      return reply.status(402).send({
        error: 'subscription_required',
        message: 'このコンテンツを視聴するにはサブスクリプションが必要です',
        details: {
          required_plan: minPlan,
          current_plan: request.user.plan_id,
        },
      });
    }
  };
}

// Usage example:
// app.get('/api/premium-content', {
//   preHandler: [requireAuth, requirePlan('premium')]
// }, handler);
```

### 2.4 リフレッシュトークンローテーション

```typescript
import crypto from 'crypto';

export async function refreshAccessToken(refreshToken: string) {
  // リフレッシュトークンをハッシュ化
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // セッションを検索
  const session = await db.query(
    `SELECT * FROM user_sessions
     WHERE refresh_token_hash = $1
       AND expires_at > NOW()
       AND is_revoked = FALSE`,
    [tokenHash]
  );

  if (!session) {
    throw new Error('Invalid or expired refresh token');
  }

  // 新しいアクセストークン生成
  const newAccessToken = jwt.sign(
    {
      sub: session.user_id,
      email: session.email,
      role: session.role,
      plan_id: session.plan_id,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  // 新しいリフレッシュトークン生成
  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  // 古いリフレッシュトークンを無効化
  await db.query(
    'UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1',
    [session.id]
  );

  // 新しいセッション作成
  await db.query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [session.user_id, newTokenHash]
  );

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    expires_in: 86400,
  };
}
```

---

## 3. 認可（Authorization）

### 3.1 ロールベースアクセス制御（RBAC）

**ロール定義**:

| ロール | 権限 |
|--------|------|
| **user** | 動画視聴、いいね、コメント |
| **creator** | user権限 + 動画投稿、ライブ配信、収益管理 |
| **admin** | creator権限 + ユーザー管理、コンテンツ削除 |

**権限マトリックス**:

| 操作 | user | creator | admin |
|------|------|---------|-------|
| 動画視聴 | ✅ | ✅ | ✅ |
| 動画投稿 | ❌ | ✅ | ✅ |
| 自分の動画削除 | ❌ | ✅ | ✅ |
| 他人の動画削除 | ❌ | ❌ | ✅ |
| ライブ配信 | ❌ | ✅ | ✅ |
| 収益出金 | ❌ | ✅ | ✅ |
| ユーザー停止 | ❌ | ❌ | ✅ |

### 3.2 リソースベースアクセス制御

```typescript
// 自分のコンテンツのみ編集可能
export async function requireOwnership(request: FastifyRequest, reply: FastifyReply) {
  const contentId = request.params.id;
  const userId = request.user.sub;

  const content = await db.query('SELECT user_id FROM videos WHERE id = $1', [contentId]);

  if (!content) {
    return reply.code(404).send({
      error: 'not_found',
      message: 'コンテンツが見つかりません'
    });
  }

  if (content.user_id !== userId && request.user.role !== 'admin') {
    return reply.code(403).send({
      error: 'content_not_owned',
      message: 'このコンテンツを編集する権限がありません',
    });
  }

  request.content = content;
}

// 使用例
fastify.patch('/api/videos/:id', {
  onRequest: [requireAuth, requireOwnership]
}, updateVideo);
```

---

## 4. データ暗号化

### 4.1 転送時暗号化（TLS 1.3）

**Nginx設定**:
```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    # TLS 1.3のみ許可
    ssl_protocols TLSv1.3;

    # 強固な暗号スイート
    ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
    ssl_prefer_server_ciphers on;

    # SSL証明書（Let's Encrypt推奨）
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;

    location / {
        proxy_pass http://api-backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.2 保存時暗号化

**データベース暗号化**:
```sql
-- PostgreSQL: 透過的データ暗号化（TDE）
-- AWS RDS: 自動暗号化有効化

-- CloudSQL設定例
resource "google_sql_database_instance" "postgres" {
  settings {
    backup_configuration {
      enabled = true
    }

    # 保存時暗号化（デフォルト有効）
    disk_encryption_configuration {
      kms_key_name = google_kms_crypto_key.sql_key.id
    }
  }
}
```

**S3暗号化**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'ap-northeast-1' });

await s3.send(new PutObjectCommand({
  Bucket: 'video-platform-uploads-prod',
  Key: `videos/${userId}/${videoId}.mp4`,
  Body: fileStream,
  ServerSideEncryption: 'AES256', // S3管理キー
  // または
  // ServerSideEncryption: 'aws:kms', // KMS管理キー
  // SSEKMSKeyId: 'arn:aws:kms:...',
}));
```

### 4.3 機密データの暗号化

**パスワードハッシュ化**:
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// ハッシュ化
async function hashPassword(plainPassword: string): Promise<string> {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// 検証
async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hash);
}
```

**決済情報の保護**:
```typescript
// カード情報は自前で保存しない（PCI DSS準拠）
// Stripe/CCBillに委譲

// Stripeトークン化例
const token = await stripe.tokens.create({
  card: {
    number: '4242424242424242',
    exp_month: 12,
    exp_year: 2025,
    cvc: '123',
  },
});

// トークンIDのみDB保存
await db.query(
  'INSERT INTO payment_methods (user_id, external_payment_method_id) VALUES ($1, $2)',
  [userId, token.id]
);
```

**個人情報の暗号化（マイナンバー等）**:
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32バイト
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// 使用例
const individualNumber = '123456789012';
const encrypted = encrypt(individualNumber);

await db.query(
  'UPDATE tax_info SET individual_number = $1 WHERE user_id = $2',
  [encrypted, userId]
);
```

---

## 5. 脆弱性対策

### 5.1 SQL Injection防止

**パラメータ化クエリ（必須）**:
```typescript
// ✅ SAFE: Parameterized query
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ UNSAFE: String concatenation
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

**Prisma使用（推奨）**:
```typescript
// 自動的にパラメータ化される
const user = await prisma.user.findUnique({
  where: { email: email },
});
```

### 5.2 XSS (Cross-Site Scripting) 防止

**入力サニタイゼーション**:
```typescript
import xss from 'xss';

function sanitizeInput(input: string): string {
  return xss(input, {
    whiteList: {
      b: [], i: [], u: [], a: ['href'], br: [],
    },
    stripIgnoreTag: true,
  });
}

// 使用例
const sanitizedTitle = sanitizeInput(req.body.title);
```

**Content Security Policy (CSP)**:
```typescript
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.example.com'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    mediaSrc: ["'self'", 'https://d123.cloudfront.net'],
    connectSrc: ["'self'", 'https://api.example.com'],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
  },
}));
```

### 5.3 CSRF (Cross-Site Request Forgery) 防止

**CSRFトークン**:
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

// 状態変更操作にCSRF保護適用
app.post('/api/videos/create', csrfProtection, requireAuth, createVideo);

// CSRFトークン取得エンドポイント
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**SameSite Cookie**:
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET!,
  cookie: {
    httpOnly: true,
    secure: true, // HTTPS必須
    sameSite: 'strict',
    maxAge: 2592000000, // 30日
  },
}));
```

### 5.4 レート制限

```typescript
import Redis from 'ioredis';

const redis = new Redis();

async function rateLimiter(key: string, limit: number, window: number) {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  if (current > limit) {
    const ttl = await redis.ttl(key);
    throw {
      status: 429,
      error: 'rate_limit_exceeded',
      message: 'リクエスト数が上限を超えました',
      retry_after: ttl,
    };
  }

  return current;
}

// Fastify hook
function rateLimit(limit: number, window: number) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `rate_limit:${request.ip}:${request.routerPath}`;

    try {
      await rateLimiter(key, limit, window);
    } catch (error) {
      return reply.code(error.status).send(error);
    }
  };
}

// 使用例
fastify.post('/api/auth/login', {
  onRequest: rateLimit(5, 900)
}, login); // 5回/15分

fastify.post('/api/videos/create', {
  onRequest: [requireAuth, rateLimit(10, 60)]
}, createVideo); // 10回/分
```

### 5.5 セキュリティヘッダー（Helmet.js）

```typescript
import helmet from 'helmet';

app.use(helmet({
  // X-Powered-By ヘッダー削除
  hidePoweredBy: true,

  // X-Frame-Options: DENY
  frameguard: { action: 'deny' },

  // X-Content-Type-Options: nosniff
  noSniff: true,

  // X-XSS-Protection: 1; mode=block
  xssFilter: true,

  // Strict-Transport-Security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  // Content-Security-Policy (上記参照)
  contentSecurityPolicy: { /* ... */ },
}));
```

---

## 6. 年齢確認（Adult Content）

### 6.1 Premium+プラン年齢確認フロー

```typescript
// フロントエンド
function showAgeConfirmation() {
  return (
    <div>
      <p>18歳以上であることを確認してください</p>
      <label>
        <input type="checkbox" checked={ageConfirmed} onChange={setAgeConfirmed} />
        私は18歳以上です
      </label>
      <button disabled={!ageConfirmed} onClick={proceedToPayment}>
        確認して支払いに進む
      </button>
    </div>
  );
}

// バックエンド
app.post('/api/subscriptions/create-ccbill-checkout', requireAuth, async (req, res) => {
  const { plan_id, age_confirmed } = req.body;

  if (plan_id === 'plan_premium_plus' && !age_confirmed) {
    return res.status(400).json({
      error: 'age_confirmation_required',
      message: '18歳以上の確認が必要です',
    });
  }

  // CCBillで二重チェック（クレジットカード情報で年齢確認）
  const checkoutUrl = createCCBillCheckoutUrl(req.user.sub, req.user.email);

  // 年齢確認ログ保存
  await db.query(
    `INSERT INTO age_verification_logs (user_id, confirmed_at, ip_address)
     VALUES ($1, NOW(), $2)`,
    [req.user.sub, req.ip]
  );

  res.json({ checkout_url: checkoutUrl });
});
```

### 6.2 アダルトコンテンツアクセス制御

```typescript
function requireAdultAccess(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user.has_adult_access) {
    return reply.code(403).send({
      error: 'premium_plus_required',
      message: 'このコンテンツを視聴するにはPremium+プランが必要です',
    });
  }
}

// 使用例
fastify.get('/api/videos/:id', {
  onRequest: requireAuth
}, async (request, reply) => {
  const video = await db.query('SELECT * FROM videos WHERE id = $1', [request.params.id]);

  if (video.is_adult && !request.user.has_adult_access) {
    return reply.code(403).send({
      error: 'premium_plus_required',
      message: 'このコンテンツを視聴するにはPremium+プランが必要です',
    });
  }

  // 動画取得処理
});
```

---

## 7. 監査ログ

### 7.1 監査ログ記録

**ログ対象操作**:
- ユーザー登録・ログイン・ログアウト
- パスワード変更
- サブスクプラン変更
- 動画投稿・削除
- 決済処理
- 出金申請
- 管理者操作

**監査ログテーブル**:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at DESC)
);
```

**監査ログ記録実装**:
```typescript
async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any,
  req: Request
) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, action, resourceType, resourceId, JSON.stringify(details), req.ip, req.headers['user-agent']]
  );
}

// 使用例
app.post('/api/videos/create', requireAuth, async (req, res) => {
  const video = await createVideo(req.user.sub, req.body);

  await logAudit(req.user.sub, 'video.create', 'video', video.id, { title: video.title }, req);

  res.json(video);
});
```

### 7.2 監査ログ保持期間

- **一般ログ**: 90日間保持
- **セキュリティログ**: 1年間保持
- **決済ログ**: 7年間保持（法的要件）

---

## 8. 脆弱性スキャン

### 8.1 依存関係スキャン

```bash
# npm audit (定期実行)
npm audit

# Snyk (CI/CD統合)
npx snyk test

# Dependabot (GitHub自動PR)
```

### 8.2 コンテナスキャン

```bash
# Trivy
trivy image gcr.io/project-id/api-server:latest

# Grype
grype gcr.io/project-id/api-server:latest
```

### 8.3 SAST (Static Application Security Testing)

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [push, pull_request]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run CodeQL
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript, typescript

      - name: Run SonarQube
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

---

## 9. コンプライアンス

### 9.1 GDPR対応

- **データポータビリティ**: ユーザーデータエクスポート機能
- **忘れられる権利**: アカウント完全削除機能
- **データ処理同意**: Cookie同意バナー

```typescript
// データエクスポート
app.get('/api/users/export-data', requireAuth, async (req, res) => {
  const userData = await db.query(
    `SELECT id, email, name, created_at FROM users WHERE id = $1`,
    [req.user.sub]
  );

  const videos = await db.query(
    `SELECT id, title, description, created_at FROM videos WHERE user_id = $1`,
    [req.user.sub]
  );

  res.json({
    user: userData,
    videos: videos,
  });
});

// アカウント削除
app.delete('/api/users/delete-account', requireAuth, async (req, res) => {
  // カスケード削除（ON DELETE CASCADE）
  await db.query('DELETE FROM users WHERE id = $1', [req.user.sub]);

  res.json({ message: 'アカウントを削除しました' });
});
```

### 9.2 PCI DSS準拠

- **カード情報の非保存**: Stripe/CCBillに委譲
- **TLS 1.3必須**
- **アクセスログ記録**

---

## 10. セキュリティチェックリスト

- [ ] 全エンドポイントでHTTPS必須
- [ ] JWT署名検証実装
- [ ] パスワードbcryptハッシュ化（cost 12以上）
- [ ] SQL Injection対策（パラメータ化クエリ）
- [ ] XSS対策（入力サニタイゼーション、CSP）
- [ ] CSRF対策（トークン、SameSite Cookie）
- [ ] レート制限実装
- [ ] Helmet.jsセキュリティヘッダー
- [ ] S3バケットパブリックアクセス無効化
- [ ] 環境変数で機密情報管理
- [ ] 定期的な依存関係アップデート
- [ ] 監査ログ記録
- [ ] 定期的な脆弱性スキャン

---

## 11. 関連ドキュメント

- `specs/references/authentication.md` - 認証詳細仕様
- `specs/architecture/system-overview.md` - システム全体構成
- `specs/architecture/deployment.md` - デプロイ戦略
- `specs/architecture/monitoring.md` - 監視・ロギング
