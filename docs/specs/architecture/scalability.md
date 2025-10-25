# スケーラビリティ戦略仕様書

## 1. 概要

本ドキュメントでは、動画配信プラットフォームのスケーラビリティ戦略、水平スケーリング、キャッシング、データベース最適化、およびパフォーマンスターゲットについて詳述する。

### 1.1 スケーラビリティ目標

- **同時接続数**: 100万ユーザー
- **APIレスポンスタイム**: P95 < 200ms
- **動画開始時間**: P95 < 2秒
- **データベーススループット**: 10,000 QPS
- **可用性**: 99.9% SLA

---

## 2. 水平スケーリング戦略

### 2.1 アプリケーションサーバースケーリング

**Kubernetes HorizontalPodAutoscaler**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

**スケーリング動作**:
```
低負荷時: 3 Pods
中負荷時: 10 Pods
高負荷時: 30 Pods
ピーク時: 50 Pods (上限)
```

### 2.2 ロードバランシング

**Application Load Balancer (ALB)設定**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  selector:
    app: api-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  sessionAffinity: None  # セッションアフィニティなし（Redisでセッション管理）
```

**ヘルスチェック**:
```typescript
// healthcheck.ts
import express from 'express';

const app = express();

// Liveness Probe: サーバーが生存しているか
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness Probe: トラフィック受信可能か
app.get('/ready', async (req, res) => {
  try {
    // DB接続チェック
    await db.query('SELECT 1');

    // Redis接続チェック
    await redis.ping();

    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});
```

---

## 3. データベーススケーリング

### 3.1 Read Replica構成

```
┌──────────────┐
│   Master DB  │ (Write)
│ (Primary)    │
└──────┬───────┘
       │
       ├─────────┬─────────┬─────────┐
       │         │         │         │
┌──────▼───┐ ┌──▼──────┐ ┌▼────────┐
│ Replica1 │ │Replica2 │ │Replica3 │
│ (Read)   │ │(Read)   │ │(Read)   │
└──────────┘ └─────────┘ └─────────┘
```

**Read/Write分離実装**:
```typescript
import { PrismaClient } from '@prisma/client';

// Write用（Master）
const prismaWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_MASTER,
    },
  },
});

// Read用（Replica）
const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REPLICA,
    },
  },
});

// Repository実装
@injectable()
export class VideoRepository implements IVideoRepository {
  async findById(id: string): Promise<Video | null> {
    // Read操作はReplicaから
    const video = await prismaRead.video.findUnique({ where: { id } });
    return video ? Video.fromPrisma(video) : null;
  }

  async save(video: Video): Promise<void> {
    // Write操作はMasterへ
    await prismaWrite.video.create({
      data: video.toPrisma(),
    });
  }
}
```

### 3.2 コネクションプーリング（PgBouncer）

**PgBouncer設定**:
```ini
[databases]
video_platform = host=postgres-master port=5432 dbname=video_platform

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# プーリングモード
pool_mode = transaction

# 接続数制限
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
```

**メリット**:
- アプリケーションから1000接続 → PgBouncerが25接続に集約
- データベース負荷軽減
- 接続確立オーバーヘッド削減

### 3.3 データベースシャーディング（将来対応）

**シャーディング戦略（ユーザーIDベース）**:
```typescript
function getShardId(userId: string): number {
  // ユーザーIDのハッシュ値でシャード決定
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt % SHARD_COUNT; // 例: 4シャード
}

async function getUserShard(userId: string): Promise<PrismaClient> {
  const shardId = getShardId(userId);
  return shardClients[shardId]; // 事前に作成したPrismaClientインスタンス配列
}

// 使用例
const shard = await getUserShard(userId);
const user = await shard.user.findUnique({ where: { id: userId } });
```

**シャード構成**:
```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Shard 1    │   │  Shard 2    │   │  Shard 3    │   │  Shard 4    │
│ (Users      │   │ (Users      │   │ (Users      │   │ (Users      │
│  A-F)       │   │  G-L)       │   │  M-R)       │   │  S-Z)       │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

---

## 4. キャッシング戦略

### 4.1 Redis Clusterキャッシュ階層

```
┌─────────────────────────────────────────────────────┐
│                   Application                        │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│           L1 Cache (In-Memory, Node.js)              │
│  - ユーザーセッション（最大10,000件）                  │
│  - TTL: 5分                                          │
└──────────────┬──────────────────────────────────────┘
               │ Cache Miss
               ▼
┌─────────────────────────────────────────────────────┐
│           L2 Cache (Redis Cluster)                   │
│  - APIレスポンス                                      │
│  - 動画メタデータ                                     │
│  - サブスクプラン一覧                                 │
│  - TTL: 1分〜1時間                                   │
└──────────────┬──────────────────────────────────────┘
               │ Cache Miss
               ▼
┌─────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                   │
└─────────────────────────────────────────────────────┘
```

### 4.2 キャッシュ実装

**L1キャッシュ（Node.js in-memory）**:
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 300, // 5分
  checkperiod: 60, // 1分ごとに期限切れチェック
  maxKeys: 10000, // 最大10,000キー
});

async function getCachedUser(userId: string): Promise<User | null> {
  // L1キャッシュチェック
  const cached = cache.get<User>(`user:${userId}`);
  if (cached) return cached;

  // L2キャッシュチェック（Redis）
  const redisData = await redis.get(`user:${userId}`);
  if (redisData) {
    const user = JSON.parse(redisData);
    cache.set(`user:${userId}`, user); // L1にキャッシュ
    return user;
  }

  // DBから取得
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (user) {
    redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600); // 1時間
    cache.set(`user:${userId}`, user);
  }

  return user;
}
```

**L2キャッシュ（Redis）**:
```typescript
import Redis from 'ioredis';

const redis = new Redis.Cluster([
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
  { host: 'redis-node-3', port: 6379 },
]);

// キャッシュ設定
const CACHE_TTL = {
  USER: 3600,           // 1時間
  VIDEO: 300,           // 5分
  SUBSCRIPTION: 3600,   // 1時間
  PLAN: 86400,          // 24時間
};

async function cacheVideo(videoId: string, video: Video): Promise<void> {
  await redis.set(
    `video:${videoId}`,
    JSON.stringify(video),
    'EX',
    CACHE_TTL.VIDEO
  );
}

async function getCachedVideo(videoId: string): Promise<Video | null> {
  const cached = await redis.get(`video:${videoId}`);
  return cached ? JSON.parse(cached) : null;
}

// キャッシュ無効化
async function invalidateVideoCache(videoId: string): Promise<void> {
  await redis.del(`video:${videoId}`);
}
```

### 4.3 キャッシュ無効化戦略

**Write-Through Cache**:
```typescript
async function updateVideo(videoId: string, data: VideoUpdateDTO): Promise<void> {
  // DBを更新
  await db.query('UPDATE videos SET title = $1, updated_at = NOW() WHERE id = $2', [data.title, videoId]);

  // キャッシュを即座に更新
  const updatedVideo = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);
  await redis.set(`video:${videoId}`, JSON.stringify(updatedVideo), 'EX', CACHE_TTL.VIDEO);
}
```

**Cache-Aside Pattern**:
```typescript
async function getVideo(videoId: string): Promise<Video> {
  // キャッシュチェック
  let video = await getCachedVideo(videoId);

  if (!video) {
    // DBから取得
    video = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);

    if (video) {
      // キャッシュに保存
      await cacheVideo(videoId, video);
    }
  }

  return video;
}
```

---

## 5. CDNスケーリング

### 5.1 CloudFront配信最適化

**Origin Shield有効化**:
```typescript
// CloudFront Distribution設定
{
  Origins: [{
    Id: 's3-processed',
    DomainName: 'video-platform-processed-prod.s3.amazonaws.com',
    OriginShield: {
      Enabled: true,
      OriginShieldRegion: 'ap-northeast-1', // S3と同じリージョン
    },
  }],
}
```

**メリット**:
- S3へのリクエスト数を最大90%削減
- キャッシュヒット率向上

### 5.2 動画配信最適化

**Adaptive Bitrate Streaming (ABR)**:
```
┌──────────────────────────────────────────┐
│  Master Playlist (index.m3u8)            │
│                                          │
│  #EXTM3U                                 │
│  #EXT-X-STREAM-INF:BANDWIDTH=5000000    │
│  1080p/playlist.m3u8                     │
│  #EXT-X-STREAM-INF:BANDWIDTH=2500000    │
│  720p/playlist.m3u8                      │
│  #EXT-X-STREAM-INF:BANDWIDTH=1000000    │
│  480p/playlist.m3u8                      │
│  #EXT-X-STREAM-INF:BANDWIDTH=500000     │
│  360p/playlist.m3u8                      │
└──────────────────────────────────────────┘
```

**クライアント自動切り替え**:
- ネットワーク帯域 > 5Mbps → 1080p
- ネットワーク帯域 2-5Mbps → 720p
- ネットワーク帯域 1-2Mbps → 480p
- ネットワーク帯域 < 1Mbps → 360p

---

## 6. 非同期処理

### 6.1 ジョブキュー（BullMQ）

```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: 'redis',
  port: 6379,
  maxRetriesPerRequest: null,
});

// トランスコードジョブキュー
const transcodingQueue = new Queue('transcoding', { connection });

// ジョブ追加
async function enqueueTranscodingJob(mediaFileId: string, videoPath: string) {
  await transcodingQueue.add('transcode', {
    mediaFileId,
    videoPath,
  }, {
    attempts: 3, // 最大3回リトライ
    backoff: {
      type: 'exponential',
      delay: 5000, // 5秒から開始
    },
  });
}

// ワーカー
const transcodingWorker = new Worker('transcoding', async (job) => {
  const { mediaFileId, videoPath } = job.data;

  // MediaConvertジョブ作成
  const jobId = await createMediaConvertJob(mediaFileId, videoPath);

  // 進捗更新
  await job.updateProgress(50);

  // ジョブ完了待機
  await waitForMediaConvertCompletion(jobId);

  // DB更新
  await db.query('UPDATE media_files SET status = $1 WHERE id = $2', ['ready', mediaFileId]);

  return { success: true, jobId };
}, { connection });

// イベントリスナー
transcodingWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

transcodingWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

### 6.2 非同期処理対象

| 処理 | キュー | 優先度 | リトライ |
|------|-------|--------|---------|
| 動画トランスコード | transcoding | 中 | 3回 |
| メール送信 | email | 高 | 5回 |
| 通知配信 | notification | 高 | 3回 |
| おすすめ動画計算 | recommendation | 低 | 1回 |
| Elasticsearch インデックス | indexing | 中 | 3回 |

---

## 7. パフォーマンス最適化

### 7.1 データベースクエリ最適化

**インデックス戦略**:
```sql
-- 複合インデックス（頻繁に使用されるクエリ）
CREATE INDEX idx_videos_user_created ON videos(user_id, created_at DESC);

-- 部分インデックス（特定条件のみ）
CREATE INDEX idx_videos_published ON videos(created_at DESC)
WHERE privacy = 'public' AND is_adult = FALSE;

-- BRIN インデックス（時系列データ）
CREATE INDEX idx_videos_created_brin ON videos USING BRIN(created_at);
```

**クエリ実行計画確認**:
```sql
EXPLAIN ANALYZE
SELECT * FROM videos
WHERE user_id = 'usr_123'
ORDER BY created_at DESC
LIMIT 20;
```

**N+1問題解決**:
```typescript
// ❌ N+1問題あり
const videos = await prisma.video.findMany();
for (const video of videos) {
  const user = await prisma.user.findUnique({ where: { id: video.user_id } });
  // ...
}

// ✅ 解決（eager loading）
const videos = await prisma.video.findMany({
  include: {
    user: true, // 1クエリでJOIN
  },
});
```

### 7.2 APIレスポンス最適化

**Pagination**:
```typescript
async function getVideos(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      skip: offset,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.video.count(),
  ]);

  return {
    data: videos,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      has_more: offset + limit < total,
    },
  };
}
```

**Field Selection**:
```typescript
// クライアント指定フィールドのみ返す
async function getVideo(videoId: string, fields?: string[]) {
  const select = fields?.reduce((acc, field) => ({ ...acc, [field]: true }), {});

  return await prisma.video.findUnique({
    where: { id: videoId },
    select: select || undefined, // 未指定なら全フィールド
  });
}

// 使用例: GET /api/videos/:id?fields=id,title,view_count
```

**Compression**:
```typescript
import compression from 'compression';

app.use(compression({
  level: 6, // 圧縮レベル（1-9）
  threshold: 1024, // 1KB以上のレスポンスのみ圧縮
  filter: (req, res) => {
    // JSON/HTMLのみ圧縮（画像は除外）
    return /json|text|html/.test(res.getHeader('Content-Type'));
  },
}));
```

### 7.3 静的アセット最適化

**CloudFront Cache Policy**:
```typescript
{
  DefaultCacheBehavior: {
    CachePolicyId: 'custom-cache-policy',
    TargetOriginId: 's3-processed',
    ViewerProtocolPolicy: 'redirect-to-https',
    Compress: true,
  },
  CachePolicies: [{
    Name: 'custom-cache-policy',
    MinTTL: 0,
    DefaultTTL: 604800,  // 7日
    MaxTTL: 31536000,    // 1年
    ParametersInCacheKeyAndForwardedToOrigin: {
      EnableAcceptEncodingGzip: true,
      EnableAcceptEncodingBrotli: true,
    },
  }],
}
```

---

## 8. パフォーマンスターゲット

### 8.1 レスポンスタイム目標

| エンドポイント | P50 | P95 | P99 |
|---------------|-----|-----|-----|
| GET /api/subscriptions/plans | 50ms | 100ms | 200ms |
| GET /api/videos/:id | 80ms | 150ms | 250ms |
| POST /api/auth/login | 150ms | 300ms | 500ms |
| GET /api/videos/:id/stream | 100ms | 200ms | 300ms |
| POST /api/videos/create | 200ms | 400ms | 600ms |

### 8.2 スループット目標

- **API**: 10,000 req/sec
- **動画配信**: 100,000 concurrent streams
- **ライブ配信**: 10,000 concurrent streams

### 8.3 データベースパフォーマンス

- **QPS (Queries Per Second)**: 10,000 QPS
- **クエリレスポンスタイム**: P95 < 50ms
- **接続プール効率**: > 80%

---

## 9. オートスケーリングポリシー

### 9.1 スケールアウトトリガー

```yaml
scaleUp:
  stabilizationWindowSeconds: 60  # 1分間の観測
  policies:
  - type: Percent
    value: 50    # 50%ずつ増加
    periodSeconds: 60
  - type: Pods
    value: 2     # 最大2 Podsずつ増加
    periodSeconds: 60
  selectPolicy: Max  # 最大値を採用
```

**トリガー条件**:
- CPU使用率 > 70%
- メモリ使用率 > 80%
- リクエスト数 > 1000 req/sec/pod

### 9.2 スケールインポリシー

```yaml
scaleDown:
  stabilizationWindowSeconds: 300  # 5分間の観測（慎重に）
  policies:
  - type: Percent
    value: 10    # 10%ずつ減少
    periodSeconds: 60
  - type: Pods
    value: 1     # 最大1 Podずつ減少
    periodSeconds: 60
  selectPolicy: Min  # 最小値を採用
```

**トリガー条件**:
- CPU使用率 < 30%
- メモリ使用率 < 40%
- リクエスト数 < 500 req/sec/pod

---

## 10. コスト最適化

### 10.1 リソース最適化

**適切なインスタンスサイズ選定**:
```
┌──────────────┬─────────┬─────────┬──────────────┐
│ インスタンス  │ vCPU   │ Memory  │ 用途          │
├──────────────┼─────────┼─────────┼──────────────┤
│ t3.medium    │ 2      │ 4GB     │ Dev/Staging  │
│ c5.large     │ 2      │ 4GB     │ API (通常時)  │
│ c5.xlarge    │ 4      │ 8GB     │ API (高負荷)  │
│ r5.large     │ 2      │ 16GB    │ Redis/Cache  │
│ db.r5.xlarge │ 4      │ 32GB    │ Database     │
└──────────────┴─────────┴─────────┴──────────────┘
```

### 10.2 スケジュールベーススケーリング

```yaml
# 夜間スケールダウン（深夜1-6時）
apiVersion: autoscaling.k8s.io/v1
kind: ScheduledAction
metadata:
  name: scale-down-night
spec:
  schedule: "0 1 * * *"  # 毎日1時
  minReplicas: 2
  maxReplicas: 10

# 日中スケールアップ（6-24時）
apiVersion: autoscaling.k8s.io/v1
kind: ScheduledAction
metadata:
  name: scale-up-day
spec:
  schedule: "0 6 * * *"  # 毎日6時
  minReplicas: 5
  maxReplicas: 50
```

---

## 11. 関連ドキュメント

- `specs/architecture/system-overview.md` - システム全体構成
- `specs/architecture/deployment.md` - デプロイ戦略
- `specs/architecture/monitoring.md` - 監視・メトリクス
- `specs/references/content-delivery.md` - CDN配信最適化
