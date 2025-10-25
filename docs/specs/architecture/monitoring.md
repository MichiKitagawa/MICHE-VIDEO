# 監視・ロギング戦略仕様書

## 1. 概要

本ドキュメントでは、動画配信プラットフォームの監視戦略、ロギング、メトリクス収集、アラート設定、およびパフォーマンス監視について詳述する。

### 1.1 監視目標

- **可視性**: システム全体の健全性を可視化
- **早期検知**: 障害の早期発見と通知
- **分析**: パフォーマンス問題の根本原因分析
- **SLA遵守**: 99.9%可用性の維持
- **コンプライアンス**: 監査ログの記録と保持

---

## 2. ロギング戦略

### 2.1 ログレベル定義

| レベル | 用途 | 例 |
|--------|------|-----|
| **error** | エラー、例外 | API障害、DB接続エラー |
| **warn** | 警告、非クリティカル | レート制限到達、非推奨API使用 |
| **info** | 重要イベント | ユーザー登録、動画投稿、決済成功 |
| **http** | HTTPリクエスト | API呼び出しログ |
| **debug** | デバッグ情報 | 開発環境のみ |

### 2.2 Winstonロガー設定

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'api-server',
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),

    // ファイル出力（error専用）
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // ファイル出力（全レベル）
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// 本番環境ではCloudWatch Logsへ転送
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Http({
    host: 'logs.cloudwatch.amazonaws.com',
    path: '/log-group/api-server',
  }));
}

export default logger;
```

### 2.3 構造化ログ出力

```typescript
import logger from './logger';

// ユーザー登録ログ
logger.info('User registered', {
  event: 'user.registered',
  user_id: 'usr_123',
  email: 'user@example.com',
  plan: 'free',
  timestamp: new Date().toISOString(),
});

// API呼び出しログ
logger.http('API request', {
  event: 'api.request',
  method: 'POST',
  path: '/api/auth/login',
  status: 200,
  duration: 145, // ms
  user_id: 'usr_123',
  ip: '192.168.1.100',
  user_agent: 'Mozilla/5.0...',
});

// エラーログ
logger.error('Database connection failed', {
  event: 'db.connection_error',
  error: {
    message: 'Connection timeout',
    stack: err.stack,
  },
  database: 'video_platform',
  host: 'db-master.example.com',
});

// 決済ログ
logger.info('Payment succeeded', {
  event: 'payment.succeeded',
  user_id: 'usr_123',
  payment_provider: 'stripe',
  amount: 980,
  currency: 'JPY',
  transaction_id: 'pi_xxx',
});
```

### 2.4 ログミドルウェア

```typescript
import morgan from 'morgan';
import logger from './logger';

// カスタムmorganフォーマット
morgan.token('user-id', (req) => req.user?.sub || 'anonymous');

app.use(morgan(
  ':method :url :status :res[content-length] - :response-time ms :user-id',
  {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }
));

// エラーログミドルウェア
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    event: 'error.unhandled',
    error: {
      message: err.message,
      stack: err.stack,
    },
    method: req.method,
    path: req.path,
    user_id: req.user?.sub,
    ip: req.ip,
  });

  res.status(500).json({
    error: 'internal_server_error',
    message: 'サーバーエラーが発生しました',
  });
});
```

---

## 3. ログ集約

### 3.1 AWS CloudWatch Logs

**ロググループ構成**:
```
/aws/eks/production/api-server
├── /containers/api-server-1
├── /containers/api-server-2
└── /containers/api-server-3

/aws/rds/video-platform-db
├── /error
├── /general
├── /slowquery
└── /audit

/aws/lambda/transcoding-handler

/aws/mediaconvert/jobs
```

**CloudWatch Logs設定**:
```typescript
import AWS from 'aws-sdk';

const cloudwatchlogs = new AWS.CloudWatchLogs({ region: 'ap-northeast-1' });

async function createLogGroup(logGroupName: string) {
  await cloudwatchlogs.createLogGroup({
    logGroupName,
  }).promise();

  // ログ保持期間設定（90日）
  await cloudwatchlogs.putRetentionPolicy({
    logGroupName,
    retentionInDays: 90,
  }).promise();
}
```

### 3.2 ログクエリ

**CloudWatch Insights クエリ例**:

```sql
-- エラー率分析
fields @timestamp, level, message, error.message
| filter level = "error"
| stats count() as error_count by bin(5m)

-- レスポンスタイム分析
fields @timestamp, duration
| filter event = "api.request"
| stats avg(duration) as avg_duration, pct(duration, 95) as p95_duration by bin(1m)

-- ユーザー登録数
fields @timestamp, user_id
| filter event = "user.registered"
| stats count() as registration_count by bin(1h)

-- 決済失敗分析
fields @timestamp, payment_provider, error.message
| filter event = "payment.failed"
| stats count() as failure_count by payment_provider
```

---

## 4. メトリクス収集

### 4.1 Prometheus メトリクス

```typescript
import promClient from 'prom-client';

// デフォルトメトリクス（CPU、メモリ等）
promClient.collectDefaultMetrics({ timeout: 5000 });

// カスタムメトリクス
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

const videoUploads = new promClient.Counter({
  name: 'video_uploads_total',
  help: 'Total number of video uploads',
  labelNames: ['status'],
});

const transcodingJobDuration = new promClient.Histogram({
  name: 'transcoding_job_duration_seconds',
  help: 'Duration of transcoding jobs',
  labelNames: ['resolution'],
  buckets: [10, 30, 60, 120, 300, 600, 1200],
});

// メトリクスエンドポイント
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.send(await promClient.register.metrics());
});

// メトリクス記録ミドルウェア
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration.labels(req.method, req.route?.path || req.path, res.statusCode.toString()).observe(duration);
    httpRequestTotal.labels(req.method, req.route?.path || req.path, res.statusCode.toString()).inc();
  });

  next();
});

// 動画アップロード成功
videoUploads.labels('success').inc();

// トランスコード時間記録
const start = Date.now();
// ... トランスコード処理 ...
const duration = (Date.now() - start) / 1000;
transcodingJobDuration.labels('1080p').observe(duration);
```

### 4.2 監視対象メトリクス

**インフラメトリクス**:

| メトリクス | 閾値 | アラート |
|-----------|------|---------|
| CPU使用率 | > 80% | Warning |
| メモリ使用率 | > 85% | Warning |
| ディスク使用率 | > 90% | Critical |
| ネットワーク帯域 | > 80% | Warning |

**アプリケーションメトリクス**:

| メトリクス | 閾値 | アラート |
|-----------|------|---------|
| APIエラー率 | > 5% | Critical |
| API応答時間（P95） | > 500ms | Warning |
| API応答時間（P99） | > 1000ms | Critical |
| リクエスト数 | > 10,000/sec | Info |
| 同時接続数 | > 50,000 | Warning |

**ビジネスメトリクス**:

| メトリクス | 閾値 | アラート |
|-----------|------|---------|
| 新規登録数 | < 10/hour | Warning |
| 決済成功率 | < 95% | Critical |
| 動画投稿数 | < 5/hour | Info |
| ライブ配信数 | < 1/hour | Info |

**データベースメトリクス**:

| メトリクス | 閾値 | アラート |
|-----------|------|---------|
| 接続数 | > 180/200 | Warning |
| クエリ応答時間 | > 100ms | Warning |
| スロークエリ数 | > 10/min | Warning |
| レプリケーション遅延 | > 5秒 | Critical |

**トランスコードメトリクス**:

| メトリクス | 閾値 | アラート |
|-----------|------|---------|
| ジョブ失敗率 | > 10% | Critical |
| ジョブ待機数 | > 100 | Warning |
| ジョブ実行時間 | > 30分 | Warning |

---

## 5. アラート設定

### 5.1 アラートルール（Prometheus AlertManager）

```yaml
# prometheus-alerts.yaml
groups:
- name: api_alerts
  interval: 30s
  rules:
  # APIエラー率
  - alert: HighAPIErrorRate
    expr: |
      (
        sum(rate(http_requests_total{status_code=~"5.."}[5m]))
        /
        sum(rate(http_requests_total[5m]))
      ) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High API error rate ({{ $value | humanizePercentage }})"
      description: "API error rate is above 5% for 5 minutes"

  # API応答時間
  - alert: HighAPIResponseTime
    expr: |
      histogram_quantile(0.95,
        sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
      ) > 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High API response time ({{ $value }}s)"
      description: "95th percentile response time is above 500ms"

  # CPU使用率
  - alert: HighCPUUsage
    expr: |
      100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage ({{ $value }}%)"
      description: "CPU usage is above 80% for 5 minutes"

  # メモリ使用率
  - alert: HighMemoryUsage
    expr: |
      (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage ({{ $value }}%)"
      description: "Memory usage is above 85% for 5 minutes"

  # DB接続数
  - alert: HighDatabaseConnections
    expr: |
      pg_stat_database_numbackends{datname="video_platform"} > 180
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High database connections ({{ $value }})"
      description: "Database connections exceed 180"

  # 決済失敗率
  - alert: HighPaymentFailureRate
    expr: |
      (
        sum(rate(payment_total{status="failed"}[10m]))
        /
        sum(rate(payment_total[10m]))
      ) > 0.05
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "High payment failure rate ({{ $value | humanizePercentage }})"
      description: "Payment failure rate is above 5% for 10 minutes"
```

### 5.2 AlertManager設定

```yaml
# alertmanager.yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h
  receiver: 'slack-notifications'

  routes:
  # Critical アラートは即座にPagerDuty + Slack
  - match:
      severity: critical
    receiver: 'pagerduty-critical'
    continue: true

  # Warning アラートはSlackのみ
  - match:
      severity: warning
    receiver: 'slack-notifications'

receivers:
- name: 'slack-notifications'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/xxx'
    channel: '#alerts'
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

- name: 'pagerduty-critical'
  pagerduty_configs:
  - service_key: 'xxx'
    description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
```

### 5.3 通知チャネル

| 重要度 | 通知先 | 応答時間 |
|--------|--------|---------|
| **Critical** | PagerDuty + Slack | 即座 |
| **Warning** | Slack | 5分以内 |
| **Info** | Slack (低優先度) | 通知のみ |

---

## 6. ダッシュボード

### 6.1 Grafanaダッシュボード

**システム概要ダッシュボード**:
```json
{
  "dashboard": {
    "title": "System Overview",
    "panels": [
      {
        "title": "API Requests per Second",
        "targets": [{
          "expr": "sum(rate(http_requests_total[5m]))"
        }]
      },
      {
        "title": "API Response Time (P95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "(sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))) * 100"
        }]
      },
      {
        "title": "Active Users",
        "targets": [{
          "expr": "active_users"
        }]
      },
      {
        "title": "CPU Usage",
        "targets": [{
          "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
        }]
      },
      {
        "title": "Memory Usage",
        "targets": [{
          "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
        }]
      }
    ]
  }
}
```

**ビジネスダッシュボード**:
- 新規登録数（時間別、日別）
- 動画投稿数（カテゴリ別）
- 動画視聴数（トップ10）
- ライブ配信数・視聴者数
- 決済成功数・失敗数
- 収益サマリー

**データベースダッシュボード**:
- 接続数
- クエリ実行時間
- スロークエリ数
- レプリケーション遅延
- テーブルサイズ

---

## 7. トレーシング（分散トレーシング）

### 7.1 OpenTelemetry統合（オプション）

```typescript
import { NodeTracerProvider } from '@opentelemetry/node';
import { SimpleSpanProcessor } from '@opentelemetry/tracing';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();

const exporter = new JaegerExporter({
  serviceName: 'api-server',
  host: 'jaeger-collector',
  port: 14268,
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

// トレーシング例
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('api-server');

async function getVideo(videoId: string) {
  const span = tracer.startSpan('getVideo');

  try {
    span.setAttribute('video.id', videoId);

    // DB取得
    const dbSpan = tracer.startSpan('db.query', { parent: span });
    const video = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    dbSpan.end();

    // Redis キャッシュ
    const cacheSpan = tracer.startSpan('redis.set', { parent: span });
    await redis.set(`video:${videoId}`, JSON.stringify(video));
    cacheSpan.end();

    return video;
  } finally {
    span.end();
  }
}
```

---

## 8. ヘルスチェック

### 8.1 Kubernetes Probes

**Liveness Probe** (サーバー生存確認):
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Readiness Probe** (トラフィック受信可否):
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 3
```

**実装**:
```typescript
// Liveness: サーバーが起動しているか
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: 依存サービスが利用可能か
app.get('/ready', async (req, res) => {
  try {
    // PostgreSQL接続チェック
    await db.query('SELECT 1');

    // Redis接続チェック
    await redis.ping();

    // Elasticsearch接続チェック（オプション）
    await esClient.ping();

    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
        elasticsearch: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
    });
  }
});
```

---

## 9. パフォーマンスモニタリング

### 9.1 APM (Application Performance Monitoring)

**New Relic統合**（オプション）:
```typescript
require('newrelic');
import express from 'express';

const app = express();

// New Relicが自動的に計測
// - トランザクション時間
// - データベースクエリ
// - 外部API呼び出し
// - エラー率
```

**Datadog APM**（オプション）:
```typescript
import tracer from 'dd-trace';

tracer.init({
  service: 'api-server',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
});
```

### 9.2 スロークエリ監視

**PostgreSQL設定**:
```sql
-- スロークエリログ有効化
ALTER SYSTEM SET log_min_duration_statement = 500; -- 500ms以上

-- pg_stat_statements拡張
CREATE EXTENSION pg_stat_statements;

-- スロークエリTOP10
SELECT
  query,
  calls,
  total_time / calls AS avg_time,
  total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

---

## 10. インシデント対応

### 10.1 インシデント分類

| レベル | 影響 | 応答時間 | 例 |
|--------|------|---------|-----|
| **P1 (Critical)** | サービス全停止 | 15分以内 | API全体ダウン、DB障害 |
| **P2 (High)** | 主要機能停止 | 1時間以内 | 動画アップロード不可、決済エラー |
| **P3 (Medium)** | 一部機能低下 | 4時間以内 | 検索遅延、通知遅延 |
| **P4 (Low)** | 軽微な不具合 | 1営業日以内 | UI表示崩れ |

### 10.2 インシデント対応フロー

```
1. アラート受信 → Slack/PagerDuty通知
     ↓
2. インシデント確認 → Grafana/CloudWatchで状況確認
     ↓
3. トリアージ → 優先度判定（P1-P4）
     ↓
4. 対応開始 → ログ分析、メトリクス確認
     ↓
5. 応急処置 → ロールバック、サービス再起動
     ↓
6. 根本対応 → バグ修正、パッチデプロイ
     ↓
7. 事後分析 → ポストモーテム作成
     ↓
8. 再発防止 → アラート改善、自動化
```

---

## 11. ログ保持ポリシー

| ログ種別 | 保持期間 | ストレージ |
|---------|---------|-----------|
| **アプリケーションログ** | 90日 | CloudWatch Logs |
| **監査ログ** | 1年 | S3 Glacier |
| **決済ログ** | 7年 | S3 Glacier Deep Archive |
| **セキュリティログ** | 1年 | S3 Standard |
| **アクセスログ** | 30日 | CloudWatch Logs |

---

## 12. 監視チェックリスト

- [ ] CloudWatch Logsロググループ作成
- [ ] Prometheusメトリクス公開エンドポイント実装
- [ ] Grafanaダッシュボード作成
- [ ] AlertManagerアラートルール設定
- [ ] Slackアラート通知設定
- [ ] PagerDutyインテグレーション（本番のみ）
- [ ] ヘルスチェックエンドポイント実装
- [ ] スロークエリログ有効化
- [ ] 監査ログテーブル作成
- [ ] ログローテーション設定

---

## 13. 関連ドキュメント

- `specs/architecture/system-overview.md` - システム全体構成
- `specs/architecture/deployment.md` - デプロイ戦略
- `specs/architecture/security.md` - セキュリティ・監査ログ
- `specs/architecture/scalability.md` - パフォーマンスターゲット
