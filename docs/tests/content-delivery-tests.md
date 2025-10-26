# コンテンツ配信機能テスト仕様書

**参照元**: `docs/specs/features/03-content-delivery.md`

---

## 1. 概要

### 1.1 テストの目的
動画アップロード、トランスコード、CDN配信、署名付きURL生成の正確性とパフォーマンスを保証する。

### 1.2 テスト範囲
- 署名付きS3アップロードURL生成
- S3へのファイルアップロード
- AWS MediaConvertトランスコード
- HLS配信（複数画質）
- CloudFront署名付きURL生成
- アダルトコンテンツフィルタリング
- プラン別画質制限

### 1.3 テスト環境
- AWS S3 (テストバケット)
- AWS MediaConvert (テストキュー)
- CloudFront (テストディストリビューション)
- Jest, Supertest, aws-sdk-mock

---

## 2. ユニットテスト

### 2.1 署名付きURL生成

#### TC-001: S3署名付きアップロードURL生成（正常系）

**実装例**:
```typescript
import { generateSignedUploadUrl } from '@/lib/s3/upload';

describe('S3 Signed Upload URL', () => {
  it('should generate valid signed upload URL', async () => {
    const result = await generateSignedUploadUrl({
      fileName: 'test-video.mp4',
      fileType: 'video/mp4',
      userId: 'user_123'
    });

    expect(result.uploadUrl).toMatch(/^https:\/\/.*\.s3\..*\.amazonaws\.com/);
    expect(result.key).toMatch(/^uploads\/user_123\/.*\.mp4$/);
    expect(result.expiresIn).toBe(3600); // 1時間
  });

  it('should reject invalid file types', async () => {
    await expect(
      generateSignedUploadUrl({
        fileName: 'test.exe',
        fileType: 'application/x-msdownload',
        userId: 'user_123'
      })
    ).rejects.toThrow('Invalid file type');
  });

  it('should enforce file size limit', async () => {
    await expect(
      generateSignedUploadUrl({
        fileName: 'huge-video.mp4',
        fileType: 'video/mp4',
        fileSize: 6 * 1024 * 1024 * 1024, // 6GB
        userId: 'user_123'
      })
    ).rejects.toThrow('File size exceeds limit (5GB)');
  });
});
```

---

### 2.2 CloudFront署名付きURL生成

#### TC-002: CloudFront署名付きURL生成（正常系）

**実装例**:
```typescript
import { generateSignedStreamUrl } from '@/lib/cloudfront/signing';

describe('CloudFront Signed URL', () => {
  it('should generate signed streaming URL', () => {
    const videoKey = 'videos/vid_123/playlist.m3u8';
    const signedUrl = generateSignedStreamUrl(videoKey, 24 * 60 * 60); // 24時間

    expect(signedUrl).toContain('https://d1234abcd.cloudfront.net');
    expect(signedUrl).toContain('Expires=');
    expect(signedUrl).toContain('Signature=');
    expect(signedUrl).toContain('Key-Pair-Id=');
  });

  it('should set correct expiration time', () => {
    const videoKey = 'videos/vid_123/playlist.m3u8';
    const expiresIn = 3600; // 1時間
    const signedUrl = generateSignedStreamUrl(videoKey, expiresIn);

    const urlParams = new URL(signedUrl).searchParams;
    const expires = parseInt(urlParams.get('Expires')!);
    const now = Math.floor(Date.now() / 1000);

    expect(expires).toBeGreaterThan(now);
    expect(expires).toBeLessThanOrEqual(now + expiresIn + 10); // 10秒の誤差許容
  });
});
```

---

## 3. 統合テスト

### 3.1 アップロードURL取得API

#### TC-101: 署名付きアップロードURL取得（正常系）

**エンドポイント**: `POST /api/upload/initiate`

**実装例**:
```typescript
import request from 'supertest';
import app from '@/app';
import AWS from 'aws-sdk-mock';

describe('POST /api/upload/initiate', () => {
  let accessToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;
  });

  afterEach(() => {
    AWS.restore();
  });

  it('should return signed upload URL', async () => {
    AWS.mock('S3', 'getSignedUrlPromise', () => Promise.resolve('https://test.s3.amazonaws.com/signed-url'));

    const response = await request(app)
      .post('/api/upload/initiate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        file_name: 'my-video.mp4',
        file_type: 'video/mp4',
        file_size: 100 * 1024 * 1024, // 100MB
        content_type: 'video'
      });

    expect(response.status).toBe(200);
    expect(response.body.upload_url).toBeDefined();
    expect(response.body.media_file_id).toBeDefined();
    expect(response.body.s3_key).toMatch(/^uploads\/.*\/.*\.mp4$/);
    expect(response.body.expires_in).toBe(3600);
  });

  it('should reject unauthorized request', async () => {
    const response = await request(app)
      .post('/api/upload/initiate')
      .send({
        file_name: 'my-video.mp4',
        file_type: 'video/mp4'
      });

    expect(response.status).toBe(401);
  });
});
```

---

### 3.2 アップロード完了通知API

#### TC-111: アップロード完了通知（正常系）

**エンドポイント**: `POST /api/upload/complete`

**実装例**:
```typescript
describe('POST /api/upload/complete', () => {
  let accessToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;
  });

  it('should trigger transcoding on upload complete', async () => {
    AWS.mock('MediaConvert', 'createJob', (params, callback) => {
      callback(null, {
        Job: {
          Id: 'job_123',
          Status: 'SUBMITTED',
          Settings: params.Settings
        }
      });
    });

    const response = await request(app)
      .post('/api/upload/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        media_file_id: 'mf_123',
        s3_key: 'uploads/user_123/video.mp4',
        file_size: 100 * 1024 * 1024
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('トランスコードを開始しました');
    expect(response.body.transcode_job_id).toBeDefined();
    expect(response.body.status).toBe('processing');

    // DBにトランスコードジョブが記録されたか確認
    const job = await db.query('SELECT * FROM media_transcode_jobs WHERE media_file_id = $1', ['mf_123']);
    expect(job.rows).toHaveLength(1);
    expect(job.rows[0].status).toBe('processing');
  });
});
```

---

### 3.3 トランスコード完了Webhook

#### TC-121: MediaConvert完了Webhook（正常系）

**エンドポイント**: `POST /api/webhooks/mediaconvert`

**実装例**:
```typescript
describe('POST /api/webhooks/mediaconvert', () => {
  it('should update video status on transcode complete', async () => {
    const webhookPayload = {
      detail: {
        status: 'COMPLETE',
        jobId: 'job_123',
        userMetadata: {
          file_id: 'file_123',
          video_id: 'vid_123'
        },
        outputGroupDetails: [
          {
            type: 'HLS_GROUP',
            playlistFilePaths: ['videos/vid_123/playlist.m3u8'],
            outputDetails: [
              { durationInMs: 120000, videoDetails: { widthInPx: 1920, heightInPx: 1080 } },
              { durationInMs: 120000, videoDetails: { widthInPx: 1280, heightInPx: 720 } },
              { durationInMs: 120000, videoDetails: { widthInPx: 854, heightInPx: 480 } }
            ]
          }
        ]
      }
    };

    const response = await request(app)
      .post('/api/webhooks/mediaconvert')
      .send(webhookPayload);

    expect(response.status).toBe(200);

    // 動画ステータス更新確認
    const video = await db.query('SELECT * FROM videos WHERE id = $1', ['vid_123']);
    expect(video.rows[0].status).toBe('ready');
    expect(video.rows[0].video_url).toBe('videos/vid_123/playlist.m3u8');
    expect(video.rows[0].duration).toBe(120); // 秒
  });

  it('should handle transcode failure', async () => {
    const webhookPayload = {
      detail: {
        status: 'ERROR',
        jobId: 'job_123',
        userMetadata: { file_id: 'file_123', video_id: 'vid_123' },
        errorMessage: 'Invalid video codec'
      }
    };

    const response = await request(app)
      .post('/api/webhooks/mediaconvert')
      .send(webhookPayload);

    expect(response.status).toBe(200);

    // エラーステータス確認
    const job = await db.query('SELECT * FROM transcode_jobs WHERE job_id = $1', ['job_123']);
    expect(job.rows[0].status).toBe('failed');
    expect(job.rows[0].error_message).toContain('Invalid video codec');
  });
});
```

---

### 3.4 ストリーミングURL取得API

#### TC-131: ストリーミングURL取得（正常系）

**エンドポイント**: `GET /api/videos/:id/stream`

**実装例**:
```typescript
describe('GET /api/videos/:id/stream', () => {
  it('should return signed streaming URLs for Premium user', async () => {
    // Premiumユーザーでログイン
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'PremiumPass123!' });
    const premiumToken = loginRes.body.access_token;

    const response = await request(app)
      .get('/api/videos/vid_123/stream')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(response.status).toBe(200);
    expect(response.body.streams).toHaveLength(3);

    // 1080p, 720p, 480p
    const qualities = response.body.streams.map(s => s.quality);
    expect(qualities).toEqual(expect.arrayContaining(['1080p', '720p', '480p']));

    // 署名付きURL確認
    response.body.streams.forEach(stream => {
      expect(stream.url).toMatch(/https:\/\/.*\.cloudfront\.net/);
      expect(stream.url).toContain('Expires=');
      expect(stream.url).toContain('Signature=');
    });

    expect(response.body.expires_in).toBe(86400); // 24時間
  });

  it('should restrict quality for Free users', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'FreePass123!' });
    const freeToken = loginRes.body.access_token;

    const response = await request(app)
      .get('/api/videos/vid_123/stream')
      .set('Authorization', `Bearer ${freeToken}`);

    expect(response.status).toBe(200);
    expect(response.body.streams).toHaveLength(1); // 480pのみ

    const stream = response.body.streams[0];
    expect(stream.quality).toBe('480p');
  });

  it('should block adult content for non-Premium+ users', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'PremiumPass123!' });
    const premiumToken = loginRes.body.access_token;

    // アダルト動画
    const response = await request(app)
      .get('/api/videos/vid_adult/stream')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('plan_required');
    expect(response.body.required_plan).toBe('Premium+');
  });
});
```

---

## 4. E2Eテスト

### 4.1 動画アップロード〜再生フロー

#### TC-201: 完全な動画アップロードフロー（E2E）

**実装例** (Playwright):
```typescript
import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Video Upload and Playback Flow', () => {
  test('should upload and play video', async ({ page }) => {
    // 1. ログイン
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 2. アップロードページ
    await page.goto('/upload');

    // 3. ファイル選択
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');

    // 4. メタデータ入力
    await page.fill('input[name="title"]', 'Test Video Upload');
    await page.fill('textarea[name="description"]', 'This is a test video');
    await page.selectOption('select[name="category"]', 'education');

    // 5. アップロード開始
    await page.click('button:has-text("アップロード")');

    // 6. プログレスバー確認
    await expect(page.locator('text=アップロード中')).toBeVisible();

    // 7. アップロード完了
    await expect(page.locator('text=アップロードが完了しました')).toBeVisible({ timeout: 60000 });

    // 8. トランスコード待機（モック環境では即完了）
    await expect(page.locator('text=動画を処理中です')).toBeVisible();
    await expect(page.locator('text=動画の準備ができました')).toBeVisible({ timeout: 120000 });

    // 9. 動画詳細ページに遷移
    await page.click('text=動画を見る');

    // 10. 動画プレイヤー確認
    const videoPlayer = await page.locator('video');
    await expect(videoPlayer).toBeVisible();

    // 11. 再生ボタンクリック
    await page.click('button[aria-label="Play"]');

    // 12. 動画が再生されているか確認
    const isPaused = await videoPlayer.evaluate(el => (el as HTMLVideoElement).paused);
    expect(isPaused).toBe(false);
  });
});
```

---

## 5. パフォーマンステスト

### 5.1 署名付きURL生成時間

#### TC-401: URL生成時間（100ms以内）

**実装例**:
```typescript
describe('URL Generation Performance', () => {
  it('should generate signed URL within 100ms', async () => {
    const times: number[] = [];

    for (let i = 0; i < 50; i++) {
      const start = Date.now();
      await generateSignedUploadUrl({
        fileName: `test-${i}.mp4`,
        fileType: 'video/mp4',
        userId: 'user_123'
      });
      const end = Date.now();
      times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b) / times.length;
    expect(avg).toBeLessThan(100);
  });
});
```

---

## 6. テストデータ

### 6.1 サンプル動画ファイル

```typescript
export const sampleVideos = {
  valid: {
    path: 'test-fixtures/sample-video.mp4',
    size: 10 * 1024 * 1024, // 10MB
    duration: 120, // 2分
    codec: 'h264'
  },
  large: {
    path: 'test-fixtures/large-video.mp4',
    size: 500 * 1024 * 1024 // 500MB
  },
  invalid: {
    path: 'test-fixtures/invalid.avi',
    codec: 'divx'
  }
};
```

---

## 7. テストカバレッジ目標

- ユニットテスト: 85%以上
- 統合テスト: 全アップロード/ストリーミングAPI 100%
- E2Eテスト: アップロード〜再生フロー
- パフォーマンス: URL生成 < 100ms、トランスコード < 実時間の0.5倍

---

## 8. 既知の課題・制約

- MediaConvertトランスコードは実環境でのみ実行可能（モックで代替）
- 大容量ファイルのアップロードテストは時間がかかる
- CloudFrontキャッシュのテストは本番環境でのみ確認可能
