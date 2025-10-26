# ライブ配信機能テスト仕様書

**参照元**: `docs/specs/features/08-live-streaming.md`

---

## 1. 概要

### 1.1 テストの目的
リアルタイムライブ配信機能（配信作成、開始/終了、視聴、チャット、スーパーチャット、統計）の品質保証とパフォーマンス検証を実施する。

### 1.2 テスト範囲
- ライブ配信作成・ストリームキー発行
- ライブ配信開始・終了
- ライブ視聴・ストリーミングURL取得
- リアルタイムチャット（WebSocket）
- スーパーチャット送信・決済
- ライブ統計・アナリティクス
- セキュリティ対策（認証、レート制限、ストリームキー管理）
- パフォーマンス基準（配信遅延、同時接続）

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+
- Jest 29+、Supertest、Playwright
- WebSocket (Socket.io)
- RTMP Server (nginx-rtmp / AWS MediaLive)

### 1.4 依存関係
- データベース: `live_streams`, `live_chat_messages`, `live_viewers`, `live_stream_stats`
- 外部サービス: AWS MediaLive (RTMP), CloudFront (CDN), Redis (チャット)

---

## 2. ユニットテスト

### 2.1 ストリームキー生成テスト

#### TC-001: ストリームキー生成（正常系）

```typescript
import { generateStreamKey } from '@/lib/live/stream-key';

describe('Stream Key Generation', () => {
  it('should generate unique stream key', () => {
    const key1 = generateStreamKey();
    const key2 = generateStreamKey();

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
    expect(key1).toMatch(/^live_sk_[a-zA-Z0-9]{32}$/);
  });

  it('should generate cryptographically secure key', () => {
    const key = generateStreamKey();

    expect(key.length).toBe(40); // 'live_sk_' + 32文字
    expect(key.startsWith('live_sk_')).toBe(true);
  });
});
```

---

### 2.2 視聴者数カウントテスト

#### TC-002: 同時視聴者数計算

```typescript
import { calculateCurrentViewers } from '@/lib/live/viewer-counter';

describe('Viewer Count Calculation', () => {
  it('should count active viewers', () => {
    const viewers = [
      { joined_at: new Date(Date.now() - 60000), left_at: null }, // アクティブ
      { joined_at: new Date(Date.now() - 120000), left_at: null }, // アクティブ
      { joined_at: new Date(Date.now() - 180000), left_at: new Date(Date.now() - 60000) }, // 退出済み
    ];

    const count = calculateCurrentViewers(viewers);
    expect(count).toBe(2);
  });

  it('should exclude viewers who left', () => {
    const viewers = [
      { joined_at: new Date(), left_at: new Date() },
    ];

    const count = calculateCurrentViewers(viewers);
    expect(count).toBe(0);
  });
});
```

---

### 2.3 チャットメッセージバリデーション

#### TC-003: チャットメッセージ検証

```typescript
import { validateChatMessage } from '@/lib/live/chat-validator';

describe('Chat Message Validation', () => {
  it('should accept valid message', () => {
    const result = validateChatMessage('こんにちは！');

    expect(result.isValid).toBe(true);
  });

  it('should reject empty message', () => {
    const result = validateChatMessage('');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('メッセージが空です');
  });

  it('should reject message exceeding 200 characters', () => {
    const longMessage = 'a'.repeat(201);
    const result = validateChatMessage(longMessage);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('200文字');
  });

  it('should detect spam patterns', () => {
    const spam = 'https://spam.com'.repeat(10);
    const result = validateChatMessage(spam);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('スパム');
  });
});
```

---

## 3. 統合テスト

### 3.1 ライブ配信作成API

#### TC-101: POST /api/live/create（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('POST /api/live/create', () => {
  it('should create live stream successfully', async () => {
    const response = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: '今夜のライブ配信',
        description: 'ゲーム実況します！',
        category: 'gaming',
        thumbnail: 'base64_encoded_image',
        privacy: 'public',
        is_adult: false,
        chat_enabled: true,
        super_chat_enabled: true,
        archive_enabled: true,
        scheduled_start_time: '2025-10-25T20:00:00Z'
      });

    expect(response.status).toBe(201);
    expect(response.body.live_stream.id).toBeDefined();
    expect(response.body.live_stream.title).toBe('今夜のライブ配信');
    expect(response.body.live_stream.status).toBe('scheduled');
    expect(response.body.live_stream.stream_key).toMatch(/^live_sk_/);
    expect(response.body.live_stream.rtmp_url).toBeDefined();
    expect(response.body.live_stream.stream_url).toMatch(/\.m3u8$/);
  });

  it('should require creator permission', async () => {
    const response = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .send({
        title: 'ライブ配信',
        category: 'gaming'
      });

    expect(response.status).toBe(403);
  });

  it('should validate title length', async () => {
    const response = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: 'a'.repeat(201),
        category: 'gaming'
      });

    expect(response.status).toBe(400);
  });

  it('should enforce Premium plan for live streaming', async () => {
    const response = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .send({
        title: 'ライブ配信',
        category: 'gaming'
      });

    expect(response.status).toBe(402);
    expect(response.body.error).toBe('premium_required');
  });
});
```

---

### 3.2 ライブ配信開始API

#### TC-102: POST /api/live/:id/start（正常系）

```typescript
describe('POST /api/live/:id/start', () => {
  it('should start live stream successfully', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/start')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('配信を開始しました');
    expect(response.body.status).toBe('live');
    expect(response.body.actual_start_time).toBeDefined();
  });

  it('should require stream owner permission', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/start')
      .set('Authorization', `Bearer ${otherCreatorToken}`);

    expect(response.status).toBe(403);
  });

  it('should not start already live stream', async () => {
    await request(app)
      .post('/api/live/live_123456/start')
      .set('Authorization', `Bearer ${creatorToken}`);

    const response = await request(app)
      .post('/api/live/live_123456/start')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('already_live');
  });
});
```

---

### 3.3 ライブ配信終了API

#### TC-103: POST /api/live/:id/end（正常系）

```typescript
describe('POST /api/live/:id/end', () => {
  it('should end live stream successfully', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/end')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('配信を終了しました');
    expect(response.body.status).toBe('ended');
    expect(response.body.end_time).toBeDefined();
    expect(response.body.stats).toBeDefined();
    expect(response.body.stats.total_viewers).toBeGreaterThanOrEqual(0);
    expect(response.body.stats.peak_viewers).toBeGreaterThanOrEqual(0);
  });

  it('should save archive if enabled', async () => {
    const response = await request(app)
      .post('/api/live/live_archive_enabled/end')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.duration_seconds).toBeGreaterThan(0);
  });
});
```

---

### 3.4 アクティブ配信一覧API

#### TC-104: GET /api/live/active（正常系）

```typescript
describe('GET /api/live/active', () => {
  it('should get active live streams', async () => {
    const response = await request(app)
      .get('/api/live/active?page=1&limit=20');

    expect(response.status).toBe(200);
    expect(response.body.live_streams).toBeInstanceOf(Array);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);
  });

  it('should filter by category', async () => {
    const response = await request(app)
      .get('/api/live/active?category=gaming');

    expect(response.status).toBe(200);
    response.body.live_streams.forEach((stream: any) => {
      expect(stream.category).toBe('gaming');
    });
  });

  it('should include current viewer count', async () => {
    const response = await request(app)
      .get('/api/live/active?limit=1');

    expect(response.status).toBe(200);
    if (response.body.live_streams.length > 0) {
      const stream = response.body.live_streams[0];
      expect(stream.current_viewers).toBeGreaterThanOrEqual(0);
      expect(stream.status).toBe('live');
    }
  });
});
```

---

### 3.5 チャットメッセージ送信API

#### TC-105: POST /api/live/:id/chat（正常系）

```typescript
describe('POST /api/live/:id/chat', () => {
  it('should send chat message successfully', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/chat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: 'こんにちは！'
      });

    expect(response.status).toBe(201);
    expect(response.body.chat_message.id).toBeDefined();
    expect(response.body.chat_message.message).toBe('こんにちは！');
    expect(response.body.chat_message.user_name).toBeDefined();
    expect(response.body.chat_message.is_super_chat).toBe(false);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/chat')
      .send({ message: 'メッセージ' });

    expect(response.status).toBe(401);
  });

  it('should validate message length', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/chat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: 'a'.repeat(201)
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('200文字');
  });

  it('should sanitize message content', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/chat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: '<script>alert("XSS")</script>こんにちは'
      });

    expect(response.status).toBe(201);
    expect(response.body.chat_message.message).not.toContain('<script>');
  });
});
```

---

### 3.6 スーパーチャット送信API

#### TC-106: POST /api/live/:id/superchat（正常系）

```typescript
describe('POST /api/live/:id/superchat', () => {
  it('should send superchat successfully', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/superchat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 1000,
        message: '応援しています！'
      });

    expect(response.status).toBe(201);
    expect(response.body.super_chat.id).toBeDefined();
    expect(response.body.super_chat.amount).toBe(1000);
    expect(response.body.super_chat.message).toBe('応援しています！');
    expect(response.body.payment.status).toBe('completed');
    expect(response.body.payment.transaction_id).toBeDefined();
  });

  it('should validate amount', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/superchat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 50, // 最小¥100
        message: 'メッセージ'
      });

    expect(response.status).toBe(400);
  });

  it('should require message for superchat', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/superchat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 1000,
        message: ''
      });

    expect(response.status).toBe(400);
  });
});
```

---

### 3.7 ライブ統計取得API

#### TC-107: GET /api/live/:id/stats（正常系）

```typescript
describe('GET /api/live/:id/stats', () => {
  it('should get live stream stats', async () => {
    const response = await request(app)
      .get('/api/live/live_123456/stats')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.live_stream_id).toBe('live_123456');
    expect(response.body.current_viewers).toBeGreaterThanOrEqual(0);
    expect(response.body.peak_viewers).toBeGreaterThanOrEqual(0);
    expect(response.body.total_views).toBeGreaterThanOrEqual(0);
    expect(response.body.total_super_chat_amount).toBeGreaterThanOrEqual(0);
    expect(response.body.viewer_timeline).toBeInstanceOf(Array);
  });

  it('should require stream owner permission', async () => {
    const response = await request(app)
      .get('/api/live/live_123456/stats')
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

## 4. E2Eテスト

### 4.1 ライブ配信完全フロー

#### TC-201: ライブ作成〜配信〜視聴〜終了

```typescript
import { test, expect } from '@playwright/test';

test.describe('Live Streaming E2E', () => {
  test('should complete full live streaming flow', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // ライブ作成画面
    await page.goto('/creation/live/create');
    await expect(page).toHaveURL('/creation/live/create');

    // ライブ情報入力
    await page.fill('input[name="title"]', 'E2Eテストライブ配信');
    await page.fill('textarea[name="description"]', 'テスト用の配信です');
    await page.selectOption('select[name="category"]', 'gaming');

    // 作成ボタンクリック
    await page.click('button:has-text("配信を作成")');

    // ストリームキー表示確認
    await expect(page.locator('text=ストリームキー')).toBeVisible();
    await expect(page.locator('text=RTMP URL')).toBeVisible();

    // 配信開始ボタン（シミュレーション）
    await page.click('button:has-text("配信を開始")');
    await expect(page.locator('text=配信中')).toBeVisible();

    // 視聴ページで確認（別タブ）
    const viewerPage = await page.context().newPage();
    await viewerPage.goto('/(tabs)/videos');
    await viewerPage.click('text=ライブ');
    await expect(viewerPage.locator('text=E2Eテストライブ配信')).toBeVisible();
  });

  test('should interact with live chat', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'viewer@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // ライブ視聴ページ
    await page.goto('/live/live_123456');

    // チャット欄が表示されているか
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();

    // チャットメッセージ送信
    await page.fill('textarea[placeholder="メッセージを入力"]', 'こんにちは！');
    await page.click('button:has-text("送信")');

    // チャットに表示されるか
    await expect(page.locator('text=こんにちは！')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証・認可テスト

#### TC-301: ライブ配信API認証

```typescript
describe('Live Streaming Security', () => {
  it('should require authentication for chat', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/chat')
      .send({ message: 'メッセージ' });

    expect(response.status).toBe(401);
  });

  it('should require creator permission for stream creation', async () => {
    const response = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .send({
        title: 'ライブ配信',
        category: 'gaming'
      });

    expect(response.status).toBe(403);
  });

  it('should validate stream ownership for stats', async () => {
    const response = await request(app)
      .get('/api/live/live_123456/stats')
      .set('Authorization', `Bearer ${otherCreatorToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

### 5.2 レート制限テスト

#### TC-302: チャット投稿レート制限

```typescript
describe('Chat Rate Limiting', () => {
  it('should limit chat posting to 3 seconds interval', async () => {
    const res1 = await request(app)
      .post('/api/live/live_123456/chat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'メッセージ1' });
    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post('/api/live/live_123456/chat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'メッセージ2' });
    expect(res2.status).toBe(429);
  });

  it('should limit superchat to 3 per minute', async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post('/api/live/live_123456/superchat')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 100, message: `スーパーチャット${i}` })
      );
    }

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

---

### 5.3 XSS対策テスト

#### TC-303: チャットメッセージサニタイズ

```typescript
describe('XSS Prevention in Chat', () => {
  it('should sanitize script tags', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/chat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: '<script>alert("XSS")</script>こんにちは'
      });

    expect(response.status).toBe(201);
    expect(response.body.chat_message.message).not.toContain('<script>');
  });

  it('should sanitize HTML attributes', async () => {
    const response = await request(app)
      .post('/api/live/live_123456/chat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: '<img src=x onerror="alert(1)">メッセージ'
      });

    expect(response.status).toBe(201);
    expect(response.body.chat_message.message).not.toContain('onerror');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 API応答時間テスト

#### TC-401: ライブ統計応答時間（P95 < 500ms）

```typescript
describe('Live Streaming Performance', () => {
  it('should respond within 500ms for stats (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/live/live_123456/stats')
        .set('Authorization', `Bearer ${creatorToken}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });
});
```

---

### 6.2 負荷テスト（k6）

#### TC-402: 同時視聴者負荷テスト

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const params = {
    headers: {
      'Authorization': `Bearer ${__ENV.ACCESS_TOKEN}`,
    },
  };

  const res = http.get(
    'http://localhost:3000/api/live/live_123456',
    params
  );

  check(res, {
    'live stream loaded': (r) => r.status === 200,
    'has stream URL': (r) => JSON.parse(r.body).stream_url !== undefined,
  });

  sleep(3);
}
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const testLiveStreams = {
  active: {
    id: 'live_123456',
    title: 'アクティブなライブ配信',
    status: 'live',
    current_viewers: 1234,
    chat_enabled: true,
    super_chat_enabled: true,
  },

  scheduled: {
    id: 'live_scheduled',
    title: '予定されたライブ配信',
    status: 'scheduled',
    scheduled_start_time: '2025-10-25T20:00:00Z',
  },

  ended: {
    id: 'live_ended',
    title: '終了したライブ配信',
    status: 'ended',
    peak_viewers: 2345,
    total_super_chat_amount: 12345,
  },
};

export const testChatMessages = [
  {
    id: 'chat_001',
    message: 'こんにちは！',
    user_name: '山田太郎',
    is_super_chat: false,
  },
  {
    id: 'sc_001',
    message: '応援しています！',
    user_name: '田中花子',
    is_super_chat: true,
    super_chat_amount: 1000,
  },
];
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（ストリームキー生成、視聴者数計算、バリデーション）
- 統合テスト: 主要API 100%（全7エンドポイント）
- E2Eテスト: クリティカルパス 100%（ライブ作成〜配信〜視聴〜終了）
- セキュリティテスト: 認証、XSS、レート制限 100%
- パフォーマンステスト: P95応答時間、同時接続負荷

---

## 9. 既知の課題・制約

- RTMP接続テストは実際の配信ソフト（OBS等）が必要
- WebSocketチャットのリアルタイム性テストは複雑
- 同時視聴者数上限テストは大規模環境が必要
- スーパーチャット決済はStripe/CCBillのテストモード使用
- アーカイブ保存テストはトランスコード完了待ちが必要
