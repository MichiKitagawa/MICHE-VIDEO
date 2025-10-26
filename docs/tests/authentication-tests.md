# 認証機能テスト仕様書

**参照元**: `docs/specs/features/01-authentication.md`

---

## 1. 概要

### 1.1 テストの目的
認証機能（ユーザー登録、ログイン、JWT認証、パスワードリセット、メール認証、プラン管理）の品質を保証し、セキュリティ脆弱性を防ぐ。

### 1.2 テスト範囲
- ユーザー登録フロー（メール認証含む）
- ログイン・ログアウト
- JWT トークン管理（アクセストークン、リフレッシュトークン）
- パスワードリセット
- プロフィール管理
- プラン変更（Free → Premium → Premium+）
- セキュリティ対策（レート制限、XSS、SQL injection）

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+ (テスト用DB)
- Jest 29+ (ユニット・統合テスト)
- Supertest (API テスト)
- Playwright (E2E テスト)

### 1.4 依存関係
- データベース: `users`, `user_sessions`, `password_resets`
- 外部サービス: SendGrid (メール送信)、Stripe/CCBill (決済)

---

## 2. ユニットテスト

### 2.1 パスワードハッシュ化テスト

#### TC-001: パスワードハッシュ化（正常系）

**目的**: bcryptでパスワードが正しくハッシュ化されることを確認

**実装例** (Jest):
```typescript
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Password Hashing', () => {
  it('should hash password with bcrypt', async () => {
    const plainPassword = 'SecurePass123!';
    const hashed = await hashPassword(plainPassword);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(plainPassword);
    expect(hashed).toMatch(/^\$2[aby]\$/); // bcrypt format
  });

  it('should verify correct password', async () => {
    const plainPassword = 'SecurePass123!';
    const hashed = await hashPassword(plainPassword);
    const isValid = await verifyPassword(plainPassword, hashed);

    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hashed = await hashPassword('SecurePass123!');
    const isValid = await verifyPassword('WrongPassword', hashed);

    expect(isValid).toBe(false);
  });
});
```

---

### 2.2 JWT トークン生成・検証テスト

#### TC-002: JWT アクセストークン生成（正常系）

**実装例**:
```typescript
import { generateAccessToken, verifyAccessToken } from '@/lib/auth/jwt';

describe('JWT Token Generation', () => {
  it('should generate valid access token', () => {
    const payload = { userId: 'user_123', email: 'test@example.com' };
    const token = generateAccessToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('user_123');
    expect(decoded.email).toBe('test@example.com');
  });

  it('should include expiration time', () => {
    const payload = { userId: 'user_123' };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('should reject expired token', async () => {
    // Mock時刻を進める
    jest.useFakeTimers();
    const token = generateAccessToken({ userId: 'user_123' });

    // 16分進める（有効期限15分）
    jest.advanceTimersByTime(16 * 60 * 1000);

    expect(() => verifyAccessToken(token)).toThrow('Token expired');
    jest.useRealTimers();
  });
});
```

---

### 2.3 メールアドレスバリデーション

#### TC-003: メールアドレス形式検証（正常系・異常系）

**実装例**:
```typescript
import { validateEmail } from '@/lib/validation';

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user+tag@domain.co.jp',
      'name.surname@company.org'
    ];

    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'invalid',
      '@example.com',
      'user@',
      'user @example.com',
      'user@.com'
    ];

    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });
});
```

---

### 2.4 パスワード強度検証

#### TC-004: パスワード要件チェック（境界値）

**実装例**:
```typescript
import { validatePassword } from '@/lib/validation';

describe('Password Strength Validation', () => {
  it('should accept strong passwords', () => {
    const strongPasswords = [
      'SecurePass123!',
      'MyP@ssw0rd2024',
      'Str0ng!P@ss'
    ];

    strongPasswords.forEach(password => {
      expect(validatePassword(password)).toEqual({ valid: true });
    });
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Sh0rt!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('最小8文字必要');
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('lowercase123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('大文字が必要');
  });

  it('should reject password without lowercase', () => {
    const result = validatePassword('UPPERCASE123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('小文字が必要');
  });

  it('should reject password without number', () => {
    const result = validatePassword('NoNumber!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('数字が必要');
  });

  it('should reject password without special character', () => {
    const result = validatePassword('NoSpecial123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('特殊文字が必要');
  });
});
```

---

## 3. 統合テスト

### 3.1 ユーザー登録API

#### TC-101: ユーザー登録（正常系）

**エンドポイント**: `POST /api/auth/register`

**実装例** (Supertest):
```typescript
import request from 'supertest';
import app from '@/app';
import { db } from '@/lib/db';

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  });

  it('should register a new user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.user.name).toBe('Test User');
    expect(response.body.access_token).toBeDefined();
    expect(response.body.refresh_token).toBeDefined();

    // DBにユーザーが作成されたか確認
    const result = await db.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].is_email_verified).toBe(false);
  });

  it('should send verification email', async () => {
    // SendGridモック
    const sendEmailMock = jest.fn();
    jest.spyOn(require('@/lib/email'), 'sendEmail').mockImplementation(sendEmailMock);

    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });

    expect(sendEmailMock).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('メールアドレスを確認'),
      expect.anything()
    );
  });
});
```

---

#### TC-102: ユーザー登録（異常系 - メール重複）

**実装例**:
```typescript
describe('POST /api/auth/register - Email Conflict', () => {
  it('should return 409 for duplicate email', async () => {
    // 既存ユーザー作成
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'First User'
      });

    // 同じメールで再度登録
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'DifferentPass123!',
        name: 'Second User'
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('email_already_exists');
    expect(response.body.message).toContain('既に使用されています');
  });
});
```

---

#### TC-103: ユーザー登録（異常系 - バリデーション）

**実装例**:
```typescript
describe('POST /api/auth/register - Validation Errors', () => {
  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
  });

  it('should reject weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
    expect(response.body.details).toContain('パスワードが要件を満たしていません');
  });
});
```

---

### 3.2 ログインAPI

#### TC-111: ログイン（正常系）

**エンドポイント**: `POST /api/auth/login`

**実装例**:
```typescript
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // テストユーザー作成
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });
  });

  it('should login successfully with correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.access_token).toBeDefined();
    expect(response.body.refresh_token).toBeDefined();

    // セッションが作成されたか確認
    const sessions = await db.query('SELECT * FROM user_sessions WHERE user_id = (SELECT id FROM users WHERE email = $1)', ['test@example.com']);
    expect(sessions.rows.length).toBeGreaterThan(0);
  });
});
```

---

#### TC-112: ログイン（異常系 - 認証失敗）

**実装例**:
```typescript
describe('POST /api/auth/login - Authentication Failure', () => {
  it('should return 401 for incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword123!'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('invalid_credentials');
    expect(response.body.message).toContain('メールアドレスまたはパスワードが正しくありません');
  });

  it('should return 401 for non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'SecurePass123!'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('invalid_credentials');
  });
});
```

---

### 3.3 トークンリフレッシュAPI

#### TC-121: トークンリフレッシュ（正常系）

**エンドポイント**: `POST /api/auth/refresh`

**実装例**:
```typescript
describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeEach(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });
    refreshToken = response.body.refresh_token;
  });

  it('should refresh access token successfully', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.access_token).toBeDefined();
    expect(response.body.access_token).not.toBe(refreshToken);
  });

  it('should reject invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'invalid_token' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('invalid_refresh_token');
  });
});
```

---

### 3.4 パスワードリセットAPI

#### TC-131: パスワードリセット要求（正常系）

**エンドポイント**: `POST /api/auth/request-password-reset`

**実装例**:
```typescript
describe('POST /api/auth/request-password-reset', () => {
  it('should send password reset email', async () => {
    const sendEmailMock = jest.fn();
    jest.spyOn(require('@/lib/email'), 'sendEmail').mockImplementation(sendEmailMock);

    const response = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('パスワードリセットメールを送信しました');

    expect(sendEmailMock).toHaveBeenCalled();

    // リセットトークンがDBに保存されたか確認
    const tokens = await db.query('SELECT * FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = $1)', ['test@example.com']);
    expect(tokens.rows).toHaveLength(1);
    expect(tokens.rows[0].expires_at).toBeDefined();
  });
});
```

---

#### TC-132: パスワードリセット実行（正常系）

**エンドポイント**: `POST /api/auth/reset-password`

**実装例**:
```typescript
describe('POST /api/auth/reset-password', () => {
  let resetToken: string;

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: 'test@example.com' });

    const tokens = await db.query('SELECT token FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = $1)', ['test@example.com']);
    resetToken = tokens.rows[0].token;
  });

  it('should reset password successfully', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: resetToken,
        new_password: 'NewSecurePass456!'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('パスワードをリセットしました');

    // 新しいパスワードでログインできるか確認
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'NewSecurePass456!'
      });

    expect(loginResponse.status).toBe(200);
  });
});
```

---

## 4. E2Eテスト

### 4.1 ユーザー登録〜ログインフロー

#### TC-201: 完全な登録〜ログインフロー（正常系）

**実装例** (Playwright):
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration and Login Flow', () => {
  test('should complete full registration and login', async ({ page }) => {
    // 1. 登録ページにアクセス
    await page.goto('/auth');

    // 2. フォーム入力
    await page.fill('input[name="email"]', 'e2e-test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="name"]', 'E2E Test User');

    // 3. 登録ボタンクリック
    await page.click('button[type="submit"]');

    // 4. ダッシュボードにリダイレクト
    await expect(page).toHaveURL('/(tabs)/videos');

    // 5. ユーザー名が表示されているか確認
    await expect(page.locator('text=E2E Test User')).toBeVisible();

    // 6. ログアウト
    await page.click('button[aria-label="Settings"]');
    await page.click('text=ログアウト');

    // 7. ログインページに戻る
    await expect(page).toHaveURL('/auth');

    // 8. 再度ログイン
    await page.fill('input[name="email"]', 'e2e-test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // 9. ダッシュボードに再度ログイン
    await expect(page).toHaveURL('/(tabs)/videos');
  });
});
```

---

### 4.2 メール認証フロー

#### TC-202: メール認証完了フロー

**実装例**:
```typescript
test.describe('Email Verification Flow', () => {
  test('should verify email address', async ({ page }) => {
    // 1. 登録
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'verify-test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="name"]', 'Verify User');
    await page.click('button[type="submit"]');

    // 2. 未認証バナーが表示されるか確認
    await expect(page.locator('text=メールアドレスを確認してください')).toBeVisible();

    // 3. メール認証リンクを取得（モック）
    const verificationLink = await getLatestVerificationLink('verify-test@example.com');

    // 4. 認証リンクにアクセス
    await page.goto(verificationLink);

    // 5. 認証完了メッセージ
    await expect(page.locator('text=メールアドレスを確認しました')).toBeVisible();

    // 6. 未認証バナーが消える
    await page.goto('/(tabs)/videos');
    await expect(page.locator('text=メールアドレスを確認してください')).not.toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 レート制限テスト

#### TC-301: ログイン試行回数制限

**実装例**:
```typescript
describe('Rate Limiting - Login Attempts', () => {
  it('should block login after 5 failed attempts', async () => {
    // 5回失敗試行
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });
    }

    // 6回目はブロック
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword'
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('rate_limit_exceeded');
    expect(response.body.retry_after).toBeDefined();
  });
});
```

---

### 5.2 SQL Injectionテスト

#### TC-302: SQL Injection対策

**実装例**:
```typescript
describe('SQL Injection Prevention', () => {
  it('should prevent SQL injection in login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: "admin' OR '1'='1",
        password: "anything"
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('invalid_credentials');
  });
});
```

---

### 5.3 XSS対策テスト

#### TC-303: XSS対策（ユーザー名）

**実装例**:
```typescript
describe('XSS Prevention', () => {
  it('should sanitize user name with script tags', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'xss-test@example.com',
        password: 'SecurePass123!',
        name: '<script>alert("XSS")</script>Test User'
      });

    expect(response.status).toBe(201);
    expect(response.body.user.name).not.toContain('<script>');
    expect(response.body.user.name).toBe('Test User');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 API応答時間テスト

#### TC-401: ログインAPI応答時間

**目標**: 200ms以内（P95）

**実装例**:
```typescript
describe('Login API Performance', () => {
  it('should respond within 200ms (P95)', async () => {
    const responseTimes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });
      const end = Date.now();
      responseTimes.push(end - start);
    }

    // P95計算
    responseTimes.sort((a, b) => a - b);
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];

    expect(p95).toBeLessThan(200);
  });
});
```

---

## 7. テストデータ

### 7.1 テストユーザーフィクスチャ

```typescript
export const testUsers = {
  freeUser: {
    email: 'free@example.com',
    password: 'FreePass123!',
    name: 'Free User',
    plan: 'Free'
  },
  premiumUser: {
    email: 'premium@example.com',
    password: 'PremiumPass123!',
    name: 'Premium User',
    plan: 'Premium'
  },
  premiumPlusUser: {
    email: 'premium-plus@example.com',
    password: 'PremiumPlusPass123!',
    name: 'Premium Plus User',
    plan: 'Premium+'
  }
};
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上
- 統合テスト: 主要APIエンドポイント100%
- E2Eテスト: クリティカルユーザージャーニー100%
- セキュリティテスト: OWASP Top 10対応

---

## 9. 既知の課題・制約

- メール送信のモック化が必要
- レート制限テストはRedis必須
- E2EテストはテストDB初期化が必要
