# social機能テスト仕様書

**参照元**: `docs/specs/features/10-social.md`

---

## 1. 概要

### 1.1 テストの目的
social機能の品質保証とパフォーマンス検証を実施する。フォロー/アンフォロー、通知、アクティビティフィード機能について、プッシュ通知連携を含む包括的なテストを行う。

### 1.2 テスト範囲
- フォロー/アンフォローAPI
- 通知一覧・既読管理API
- 通知設定API
- フォロワー/フォロー中一覧API
- フォロー状態確認API
- プッシュ通知送信ロジック
- リアルタイム通知（WebSocket/SSE）
- セキュリティ（CSRF、レート制限）
- パフォーマンス基準

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+、Redis
- Jest 29+、Supertest、Playwright
- Firebase Cloud Messaging（モック）

---

## 2. ユニットテスト

### 2.1 フォローロジックテスト

#### TC-001: フォロー数カウント（正常系）

```typescript
import { updateFollowerCount, updateFollowingCount } from '@/lib/social/follow';

describe('Follow Count Logic', () => {
  it('should increment follower count', async () => {
    const userId = 'usr_789';
    await updateFollowerCount(userId, 1);

    const stats = await getUserStats(userId);
    expect(stats.follower_count).toBeGreaterThan(0);
  });

  it('should decrement follower count on unfollow', async () => {
    const userId = 'usr_789';
    const initialCount = await getFollowerCount(userId);

    await updateFollowerCount(userId, -1);

    const newCount = await getFollowerCount(userId);
    expect(newCount).toBe(initialCount - 1);
  });

  it('should update following count', async () => {
    const userId = 'usr_123';
    await updateFollowingCount(userId, 1);

    const stats = await getUserStats(userId);
    expect(stats.following_count).toBeGreaterThan(0);
  });
});
```

### 2.2 通知生成ロジックテスト

#### TC-002: 通知作成（正常系）

```typescript
import { createNotification } from '@/lib/social/notifications';

describe('Notification Creation', () => {
  it('should create new follower notification', async () => {
    const notification = await createNotification({
      user_id: 'usr_789',
      type: 'new_follower',
      title: '新しいフォロワー',
      message: '山田花子さんがフォローしました',
      actor_id: 'usr_456'
    });

    expect(notification.id).toBeDefined();
    expect(notification.type).toBe('new_follower');
    expect(notification.is_read).toBe(false);
  });

  it('should create new video notification', async () => {
    const notification = await createNotification({
      user_id: 'usr_123',
      type: 'new_video',
      title: '新しい動画が投稿されました',
      message: '田中太郎さんが「素晴らしい動画タイトル」を投稿しました',
      actor_id: 'usr_789',
      content_type: 'video',
      content_id: 'vid_123456',
      link_url: '/video/vid_123456'
    });

    expect(notification.content_type).toBe('video');
    expect(notification.link_url).toBe('/video/vid_123456');
  });
});
```

### 2.3 通知フィルタリングロジックテスト

#### TC-003: 通知設定フィルター（正常系）

```typescript
import { shouldSendNotification } from '@/lib/social/notification-filter';

describe('Notification Filtering', () => {
  it('should send notification when setting is enabled', () => {
    const settings = {
      new_video: true,
      new_follower: true,
      push_notifications: true
    };

    const result = shouldSendNotification('new_video', settings);
    expect(result).toBe(true);
  });

  it('should not send notification when setting is disabled', () => {
    const settings = {
      new_video: false,
      new_follower: true,
      push_notifications: true
    };

    const result = shouldSendNotification('new_video', settings);
    expect(result).toBe(false);
  });

  it('should not send push notification when disabled globally', () => {
    const settings = {
      new_video: true,
      push_notifications: false
    };

    const result = shouldSendNotification('new_video', settings, 'push');
    expect(result).toBe(false);
  });
});
```

### 2.4 レート制限ロジックテスト

#### TC-004: フォローレート制限（異常系）

```typescript
import { checkFollowRateLimit } from '@/lib/social/rate-limit';

describe('Follow Rate Limiting', () => {
  it('should allow follow within rate limit', async () => {
    const userId = 'usr_123';
    const result = await checkFollowRateLimit(userId);

    expect(result.allowed).toBe(true);
  });

  it('should reject follow exceeding daily limit (200)', async () => {
    const userId = 'usr_123';

    // 200回フォロー実行（モック）
    for (let i = 0; i < 200; i++) {
      await recordFollow(userId);
    }

    const result = await checkFollowRateLimit(userId);

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(200);
  });

  it('should reject rapid follow/unfollow (10 seconds)', async () => {
    const userId = 'usr_123';
    const targetUserId = 'usr_789';

    await recordFollow(userId, targetUserId);

    // 10秒以内に再フォロー試行
    const result = await checkFollowRateLimit(userId, targetUserId);

    expect(result.allowed).toBe(false);
    expect(result.wait_seconds).toBeGreaterThan(0);
  });
});
```

---

## 3. 統合テスト

### 3.1 フォローAPI統合テスト

#### TC-101: POST /api/users/:user_id/follow（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('POST /api/users/:user_id/follow', () => {
  let user1Token: string;
  let user2Token: string;
  let user2Id: string;

  beforeEach(async () => {
    const user1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@example.com', password: 'TestPass123!' });
    user1Token = user1Res.body.access_token;

    const user2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@example.com', password: 'TestPass123!' });
    user2Token = user2Res.body.access_token;
    user2Id = user2Res.body.user.id;
  });

  it('should follow user successfully', async () => {
    const response = await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('フォローしました');
    expect(response.body.user_id).toBe(user2Id);
    expect(response.body.is_following).toBe(true);
    expect(response.body.follower_count).toBeGreaterThan(0);
  });

  it('should reject self-follow', async () => {
    const response = await request(app)
      .post(`/api/users/${user1Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('cannot_follow_self');
  });

  it('should reject duplicate follow', async () => {
    // 1回目のフォロー
    await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    // 2回目のフォロー
    const response = await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('already_following');
  });
});
```

#### TC-102: DELETE /api/users/:user_id/follow（正常系）

```typescript
describe('DELETE /api/users/:user_id/follow', () => {
  it('should unfollow user successfully', async () => {
    // 先にフォロー
    await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    // アンフォロー
    const response = await request(app)
      .delete(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('フォローを解除しました');
    expect(response.body.is_following).toBe(false);
  });

  it('should reject unfollow non-followed user', async () => {
    const response = await request(app)
      .delete(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('not_following');
  });
});
```

#### TC-103: GET /api/users/:user_id/follow-status（正常系）

```typescript
describe('GET /api/users/:user_id/follow-status', () => {
  it('should return follow status', async () => {
    // フォロー
    await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    const response = await request(app)
      .get(`/api/users/${user2Id}/follow-status`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.user_id).toBe(user2Id);
    expect(response.body.is_following).toBe(true);
    expect(response.body.is_followed_by).toBeDefined();
    expect(response.body.follower_count).toBeGreaterThanOrEqual(0);
    expect(response.body.following_count).toBeGreaterThanOrEqual(0);
  });
});
```

### 3.2 フォロワー/フォロー中一覧API

#### TC-104: GET /api/users/:user_id/followers（正常系）

```typescript
describe('GET /api/users/:user_id/followers', () => {
  it('should retrieve followers list with pagination', async () => {
    const response = await request(app)
      .get(`/api/users/${user2Id}/followers`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.followers).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);

    response.body.followers.forEach((follower: any) => {
      expect(follower.user_id).toBeDefined();
      expect(follower.name).toBeDefined();
      expect(follower.avatar_url).toBeDefined();
      expect(follower.followed_at).toBeDefined();
    });
  });
});
```

#### TC-105: GET /api/users/:user_id/following（正常系）

```typescript
describe('GET /api/users/:user_id/following', () => {
  it('should retrieve following list with pagination', async () => {
    const response = await request(app)
      .get(`/api/users/${user1Id}/following`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.following).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();

    response.body.following.forEach((user: any) => {
      expect(user.user_id).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.follower_count).toBeGreaterThanOrEqual(0);
      expect(user.is_following).toBe(true);
    });
  });
});
```

### 3.3 通知API統合テスト

#### TC-106: GET /api/notifications（正常系）

```typescript
describe('GET /api/notifications', () => {
  it('should retrieve notifications with pagination', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.notifications).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.unread_count).toBeGreaterThanOrEqual(0);

    response.body.notifications.forEach((notif: any) => {
      expect(notif.id).toBeDefined();
      expect(['new_video', 'new_short', 'live_started', 'comment_reply', 'like', 'new_follower', 'tip_received']).toContain(notif.type);
      expect(notif.title).toBeDefined();
      expect(notif.message).toBeDefined();
      expect(notif.created_at).toBeDefined();
    });
  });

  it('should filter unread notifications only', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ unread_only: true });

    expect(response.status).toBe(200);
    response.body.notifications.forEach((notif: any) => {
      expect(notif.is_read).toBe(false);
    });
  });
});
```

#### TC-107: PATCH /api/notifications/:id/read（正常系）

```typescript
describe('PATCH /api/notifications/:id/read', () => {
  it('should mark notification as read', async () => {
    // 通知一覧取得
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    const unreadNotif = listRes.body.notifications.find((n: any) => !n.is_read);

    if (unreadNotif) {
      const response = await request(app)
        .patch(`/api/notifications/${unreadNotif.id}/read`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('通知を既読にしました');
    }
  });
});
```

#### TC-108: POST /api/notifications/mark-all-read（正常系）

```typescript
describe('POST /api/notifications/mark-all-read', () => {
  it('should mark all notifications as read', async () => {
    const response = await request(app)
      .post('/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('全ての通知を既読にしました');
    expect(response.body.marked_count).toBeGreaterThanOrEqual(0);
  });
});
```

#### TC-109: GET /api/notifications/unread-count（正常系）

```typescript
describe('GET /api/notifications/unread-count', () => {
  it('should retrieve unread count', async () => {
    const response = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.unread_count).toBeGreaterThanOrEqual(0);
  });
});
```

### 3.4 通知設定API統合テスト

#### TC-110: GET /api/notifications/settings（正常系）

```typescript
describe('GET /api/notifications/settings', () => {
  it('should retrieve notification settings', async () => {
    const response = await request(app)
      .get('/api/notifications/settings')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.new_video).toBeDefined();
    expect(response.body.new_short).toBeDefined();
    expect(response.body.live_started).toBeDefined();
    expect(response.body.comment_reply).toBeDefined();
    expect(response.body.likes).toBeDefined();
    expect(response.body.new_follower).toBeDefined();
    expect(response.body.tips_received).toBeDefined();
    expect(response.body.push_notifications).toBeDefined();
  });
});
```

#### TC-111: PATCH /api/notifications/settings（正常系）

```typescript
describe('PATCH /api/notifications/settings', () => {
  it('should update notification settings', async () => {
    const response = await request(app)
      .patch('/api/notifications/settings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        new_video: true,
        live_started: false,
        push_notifications: true
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('通知設定を更新しました');
    expect(response.body.settings.new_video).toBe(true);
    expect(response.body.settings.live_started).toBe(false);
    expect(response.body.settings.push_notifications).toBe(true);
  });
});
```

---

## 4. E2Eテスト

### 4.1 フォロー完全フロー

#### TC-201: フォローから通知確認まで

```typescript
import { test, expect } from '@playwright/test';

test.describe('Social E2E - Follow Flow', () => {
  test('should complete full follow and notification flow', async ({ page }) => {
    // User1 ログイン
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // チャンネルページに遷移
    await page.goto('/channel/usr_789');

    // フォローボタンクリック
    await page.click('button:has-text("フォロー")');

    // ボタンが「フォロー中」に変化
    await expect(page.locator('button:has-text("フォロー中")')).toBeVisible();

    // フォロワー数が増加
    await expect(page.locator('text=/\\d+ フォロワー/')).toBeVisible();

    // User2 でログイン（フォローされたユーザー）
    await page.goto('/logout');
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'user2@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 通知アイコンをクリック
    await page.click('[aria-label="通知"]');

    // 新規フォロワー通知を確認
    await expect(page.locator('text=さんがフォローしました')).toBeVisible();

    // 通知バッジ（未読数）を確認
    await expect(page.locator('[aria-label="通知"] >> text=/\\d+/')).toBeVisible();
  });
});
```

### 4.2 通知設定フロー

#### TC-202: 通知設定変更フロー

```typescript
test.describe('Social E2E - Notification Settings', () => {
  test('should update notification settings', async ({ page }) => {
    // ログイン
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 設定画面に遷移
    await page.goto('/(tabs)/settings');
    await page.click('text=通知設定');

    // 新規動画通知をOFF
    await page.click('input[name="new_video"]');
    await expect(page.locator('input[name="new_video"]')).not.toBeChecked();

    // ライブ開始通知をON
    await page.click('input[name="live_started"]');
    await expect(page.locator('input[name="live_started"]')).toBeChecked();

    // 保存
    await page.click('button:has-text("保存")');

    // 成功メッセージ確認
    await expect(page.locator('text=通知設定を更新しました')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証・認可テスト

#### TC-301: 認証なしアクセス拒否

```typescript
describe('Social Security - Authentication', () => {
  it('should reject unauthenticated follow', async () => {
    const response = await request(app)
      .post('/api/users/usr_789/follow');

    expect(response.status).toBe(401);
  });

  it('should reject unauthenticated notifications access', async () => {
    const response = await request(app)
      .get('/api/notifications');

    expect(response.status).toBe(401);
  });
});
```

### 5.2 CSRF対策テスト

#### TC-302: CSRF保護

```typescript
describe('Social Security - CSRF Protection', () => {
  it('should reject follow without CSRF token', async () => {
    // CSRF トークンなしでフォロー試行
    const response = await request(app)
      .post('/api/users/usr_789/follow')
      .set('Authorization', `Bearer ${user1Token}`);
      // CSRF トークンヘッダーなし

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('csrf_token_missing');
  });
});
```

### 5.3 レート制限テスト

#### TC-303: フォローレート制限

```typescript
describe('Social Security - Rate Limiting', () => {
  it('should enforce 200 follows per day limit', async () => {
    // 200回フォロー試行
    for (let i = 0; i < 200; i++) {
      await request(app)
        .post(`/api/users/usr_${i}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);
    }

    // 201回目はレート制限エラー
    const response = await request(app)
      .post('/api/users/usr_201/follow')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('follow_limit_exceeded');
    expect(response.body.details.limit).toBe(200);
  });

  it('should enforce 10 seconds interval between follow/unfollow', async () => {
    // フォロー
    await request(app)
      .post('/api/users/usr_789/follow')
      .set('Authorization', `Bearer ${user1Token}`);

    // 即座にアンフォロー
    const response = await request(app)
      .delete('/api/users/usr_789/follow')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('rate_limit_too_fast');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 応答時間テスト

#### TC-401: フォロー/アンフォローパフォーマンス（< 300ms）

```typescript
describe('Social Performance - Follow Actions', () => {
  it('should complete follow within 300ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .post(`/api/users/usr_${i}/follow`)
        .set('Authorization', `Bearer ${user1Token}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(300);
  });
});
```

#### TC-402: 通知一覧取得パフォーマンス（< 500ms）

```typescript
describe('Social Performance - Notifications', () => {
  it('should retrieve notifications within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user1Token}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });
});
```

#### TC-403: 未読通知数取得パフォーマンス（< 100ms、キャッシュ）

```typescript
describe('Social Performance - Unread Count', () => {
  it('should retrieve unread count within 100ms (P95, cached)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(100);
  });
});
```

### 6.2 負荷テスト（k6）

#### TC-404: フォロー同時実行負荷テスト

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const targetUserId = `usr_${Math.floor(Math.random() * 1000)}`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.USER_TOKEN}`,
    },
  };

  const res = http.post(
    `http://localhost:3000/api/users/${targetUserId}/follow`,
    null,
    params
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const socialTestData = {
  validFollow: {
    target_user_id: 'usr_789'
  },
  validNotification: {
    type: 'new_follower',
    title: '新しいフォロワー',
    message: '山田花子さんがフォローしました',
    actor_id: 'usr_456'
  },
  notificationSettings: {
    new_video: true,
    new_short: true,
    live_started: true,
    comment_reply: true,
    likes: true,
    new_follower: true,
    tips_received: true,
    email_notifications: true,
    push_notifications: true
  },
  updatedSettings: {
    new_video: false,
    live_started: true,
    push_notifications: false
  }
};
```

### 7.2 モックデータ

```typescript
export const notificationsMock = [
  {
    id: 'notif_123456',
    type: 'new_video',
    title: '新しい動画が投稿されました',
    message: '田中太郎さんが「素晴らしい動画タイトル」を投稿しました',
    thumbnail_url: 'https://cdn.example.com/thumbnails/vid_123456.jpg',
    link_url: '/video/vid_123456',
    actor: {
      user_id: 'usr_789',
      name: '田中太郎',
      avatar_url: 'https://cdn.example.com/avatars/usr_789.jpg'
    },
    is_read: false,
    created_at: '2025-10-25T12:00:00Z'
  },
  {
    id: 'notif_123457',
    type: 'new_follower',
    title: '新しいフォロワー',
    message: '山田花子さんがフォローしました',
    actor: {
      user_id: 'usr_456',
      name: '山田花子',
      avatar_url: 'https://cdn.example.com/avatars/usr_456.jpg'
    },
    is_read: false,
    created_at: '2025-10-25T11:00:00Z'
  }
];

export const followersMock = [
  {
    user_id: 'usr_456',
    name: '山田花子',
    avatar_url: 'https://cdn.example.com/avatars/usr_456.jpg',
    follower_count: 890,
    is_following: false,
    followed_at: '2025-10-20T12:00:00Z'
  }
];
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 80%以上（フォローロジック、通知生成、フィルタリング）
- 統合テスト: 主要API 100%（フォロー、通知、設定）
- E2Eテスト: クリティカルパス 100%（フォローフロー、通知フロー）
- セキュリティテスト: CSRF対策、レート制限、認証
- パフォーマンステスト: フォロー < 300ms、通知一覧 < 500ms、未読数 < 100ms

---

## 9. 既知の課題・制約

- プッシュ通知（FCM/APNs）のモック化が必要
- WebSocket/SSEのリアルタイム通知は手動検証も併用
- 大量フォロワーへの通知送信負荷テストは専用環境で実施
- フォロワー数キャッシュとDB値の整合性テストが必要
