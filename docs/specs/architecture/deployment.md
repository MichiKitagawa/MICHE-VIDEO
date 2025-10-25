# デプロイメント戦略仕様書

## 1. 概要

本ドキュメントでは、動画配信プラットフォームのデプロイメント戦略、コンテナ化、CI/CDパイプライン、インフラ構成、およびゼロダウンタイムデプロイについて詳述する。

### 1.1 デプロイメント目標

- **自動化**: CI/CDによる自動デプロイ
- **ゼロダウンタイム**: ローリングアップデートによる無停止デプロイ
- **環境分離**: dev/staging/production環境の明確な分離
- **ロールバック**: 5分以内のロールバック実行
- **スケーラビリティ**: 自動スケーリング対応

---

## 2. Docker化

### 2.1 Dockerfile (Backend API)

```dockerfile
# マルチステージビルド
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係インストール
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# ソースコードコピー
COPY . .

# Prismaクライアント生成
RUN npx prisma generate

# TypeScriptビルド
RUN npm run build

# 本番用イメージ
FROM node:20-alpine AS production

WORKDIR /app

# 本番依存関係のみインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルド成果物コピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# ユーザー作成（セキュリティ）
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

USER nodejs

EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "dist/server.js"]
```

### 2.2 docker-compose.yml (ローカル開発)

```yaml
version: '3.9'

services:
  # API Server
  api:
    build:
      context: ./backend
      target: builder
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/video_platform
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev_secret_key
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - db
      - redis
    command: npm run dev

  # PostgreSQL
  db:
    image: postgres:14-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=video_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/prisma/schema.prisma:/docker-entrypoint-initdb.d/schema.sql

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # Elasticsearch
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
      - xpack.security.enabled=false
    ports:
      - '9200:9200'
    volumes:
      - es_data:/usr/share/elasticsearch/data

  # Kibana (オプション)
  kibana:
    image: kibana:8.11.0
    ports:
      - '5601:5601'
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  # LocalStack (AWS Services Mock)
  localstack:
    image: localstack/localstack:latest
    ports:
      - '4566:4566'
    environment:
      - SERVICES=s3,sns,sqs,lambda
      - DEBUG=1
      - DATA_DIR=/tmp/localstack/data
    volumes:
      - localstack_data:/tmp/localstack

volumes:
  postgres_data:
  redis_data:
  es_data:
  localstack_data:
```

### 2.3 .dockerignore

```
node_modules
npm-debug.log
dist
.env
.env.local
.git
.gitignore
README.md
docs/
tests/
coverage/
*.md
.vscode
.idea
```

---

## 3. Kubernetes構成

### 3.1 Deployment (API Server)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  labels:
    app: api-server
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # ゼロダウンタイム保証
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
        version: v1.2.3
    spec:
      containers:
      - name: api
        image: gcr.io/project-id/api-server:v1.2.3
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: redis_url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
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

### 3.2 Service (LoadBalancer)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  type: LoadBalancer
  selector:
    app: api-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  sessionAffinity: ClientIP
```

### 3.3 HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
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
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

### 3.4 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  redis_url: "redis://redis-cluster:6379"
  elasticsearch_url: "http://elasticsearch:9200"
  s3_bucket: "video-platform-processed-prod"
  cloudfront_domain: "d123abc456.cloudfront.net"
```

### 3.5 Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
data:
  url: <base64_encoded_db_url>

---
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
  namespace: production
type: Opaque
data:
  secret: <base64_encoded_jwt_secret>
```

---

## 4. CI/CDパイプライン

### 4.1 GitHub Actionsワークフロー

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

env:
  PROJECT_ID: video-platform-prod
  GKE_CLUSTER: production-cluster
  GKE_ZONE: asia-northeast1-a
  IMAGE_NAME: api-server

jobs:
  # ステップ1: テスト
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # ステップ2: ビルド & プッシュ
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to GCR
        uses: docker/login-action@v2
        with:
          registry: gcr.io
          username: _json_key
          password: ${{ secrets.GCR_JSON_KEY }}

      - name: Extract version from package.json
        id: version
        run: echo "VERSION=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: |
            gcr.io/${{ env.PROJECT_ID }}/${{ env.IMAGE_NAME }}:${{ steps.version.outputs.VERSION }}
            gcr.io/${{ env.PROJECT_ID }}/${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ステップ3: データベースマイグレーション
  migrate:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Prisma migrations
        run: |
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

  # ステップ4: デプロイ
  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup gcloud CLI
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GKE_SA_KEY }}
          project_id: ${{ env.PROJECT_ID }}

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials ${{ env.GKE_CLUSTER }} --zone ${{ env.GKE_ZONE }}

      - name: Deploy to GKE
        run: |
          kubectl set image deployment/api-server \
            api=gcr.io/${{ env.PROJECT_ID }}/${{ env.IMAGE_NAME }}:${{ needs.build.outputs.VERSION }} \
            --namespace=production

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/api-server --namespace=production --timeout=300s

      - name: Verify deployment
        run: |
          kubectl get pods --namespace=production -l app=api-server

  # ステップ5: スモークテスト
  smoke-test:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Health check
        run: |
          curl -f https://api.example.com/health || exit 1

      - name: API test
        run: |
          curl -f https://api.example.com/api/subscriptions/plans || exit 1

  # ステップ6: ロールバック（失敗時）
  rollback:
    needs: [deploy, smoke-test]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Setup gcloud CLI
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GKE_SA_KEY }}
          project_id: ${{ env.PROJECT_ID }}

      - name: Rollback deployment
        run: |
          kubectl rollout undo deployment/api-server --namespace=production

      - name: Notify failure
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment failed and rolled back'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 4.2 Staging環境デプロイ

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      # 同様の手順だが、namespace: staging を使用
      - name: Deploy to GKE Staging
        run: |
          kubectl set image deployment/api-server \
            api=gcr.io/${{ env.PROJECT_ID }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --namespace=staging
```

---

## 5. 環境分離

### 5.1 環境構成

| 環境 | 用途 | インフラ | デプロイトリガー |
|------|------|----------|----------------|
| **Development** | 開発環境 | ローカルDocker Compose | 手動 |
| **Staging** | テスト環境 | GKE (小規模) | `develop`ブランチPush |
| **Production** | 本番環境 | GKE (大規模) | `main`ブランチPush |

### 5.2 環境変数管理

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/video_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev_secret_key
STRIPE_SECRET_KEY=sk_test_xxx

# .env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://staging-db:5432/video_staging
REDIS_URL=redis://staging-redis:6379
JWT_SECRET=<staging_secret>
STRIPE_SECRET_KEY=sk_test_xxx

# .env.production (Kubernetes Secretで管理)
NODE_ENV=production
DATABASE_URL=<encrypted_in_k8s_secret>
REDIS_URL=<encrypted_in_k8s_secret>
JWT_SECRET=<encrypted_in_k8s_secret>
STRIPE_SECRET_KEY=sk_live_xxx
```

---

## 6. Infrastructure as Code (Terraform)

### 6.1 GKEクラスター定義

```hcl
# terraform/gke.tf
resource "google_container_cluster" "primary" {
  name     = "production-cluster"
  location = "asia-northeast1-a"

  # ノードプール削除防止
  remove_default_node_pool = true
  initial_node_count       = 1

  # ネットワーク設定
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # マスター認証
  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  # ワークロードアイデンティティ有効化
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "api-server-pool"
  location   = "asia-northeast1-a"
  cluster    = google_container_cluster.primary.name
  node_count = 3

  node_config {
    preemptible  = false
    machine_type = "n1-standard-2"

    # OAuth スコープ
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      env = "production"
    }

    tags = ["api-server", "production"]

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  autoscaling {
    min_node_count = 3
    max_node_count = 10
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
```

### 6.2 CloudSQL (PostgreSQL)

```hcl
# terraform/cloudsql.tf
resource "google_sql_database_instance" "postgres" {
  name             = "video-platform-db-prod"
  database_version = "POSTGRES_14"
  region           = "asia-northeast1"

  settings {
    tier = "db-custom-4-16384" # 4 vCPU, 16GB RAM

    backup_configuration {
      enabled            = true
      start_time         = "03:00" # JST 12:00
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 3 # JST 12:00
      update_track = "stable"
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    database_flags {
      name  = "shared_buffers"
      value = "4096000" # 4GB
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "database" {
  name     = "video_platform"
  instance = google_sql_database_instance.postgres.name
}

# Read Replica
resource "google_sql_database_instance" "postgres_replica" {
  name                 = "video-platform-db-replica-1"
  master_instance_name = google_sql_database_instance.postgres.name
  database_version     = "POSTGRES_14"
  region               = "asia-northeast1"

  replica_configuration {
    failover_target = false
  }

  settings {
    tier = "db-custom-4-16384"
  }
}
```

### 6.3 Redis (Memorystore)

```hcl
# terraform/redis.tf
resource "google_redis_instance" "cache" {
  name           = "video-platform-redis-prod"
  tier           = "STANDARD_HA" # 高可用性
  memory_size_gb = 10
  region         = "asia-northeast1"

  redis_version     = "REDIS_7_0"
  display_name      = "Video Platform Redis"
  reserved_ip_range = "10.0.1.0/29"

  authorized_network = google_compute_network.vpc.id

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }
}
```

---

## 7. データベースマイグレーション戦略

### 7.1 Prisma Migrate

```bash
# 開発環境でマイグレーション作成
npx prisma migrate dev --name add_netflix_contents

# ステージング環境で適用
npx prisma migrate deploy

# 本番環境で適用（CI/CD経由）
npx prisma migrate deploy
```

### 7.2 ゼロダウンタイムマイグレーション原則

**原則1: Additive Only (追加のみ)**
```sql
-- OK: 新しいカラム追加（NULL許可）
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- NG: NOT NULL制約は後で追加
-- ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL;
```

**原則2: 段階的変更**
```sql
-- ステップ1: 新カラム追加（NULL許可）
ALTER TABLE users ADD COLUMN new_email VARCHAR(255);

-- ステップ2: データ移行
UPDATE users SET new_email = email;

-- ステップ3: NOT NULL制約追加
ALTER TABLE users ALTER COLUMN new_email SET NOT NULL;

-- ステップ4: 旧カラム削除（次回デプロイ）
-- ALTER TABLE users DROP COLUMN email;
```

**原則3: インデックス作成は非同期**
```sql
-- CONCURRENT オプション使用（ロックなし）
CREATE INDEX CONCURRENTLY idx_videos_created_at ON videos(created_at DESC);
```

---

## 8. ゼロダウンタイムデプロイ戦略

### 8.1 Blue-Green Deployment

```
┌────────────────────────────────────┐
│      Load Balancer (ALB)           │
└────────┬───────────────────────────┘
         │
    ┌────┴────┐
    │ Switch  │
    └────┬────┘
         │
    ┌────┴─────────────────┐
    │                      │
┌───▼────┐           ┌─────▼───┐
│ Blue   │           │ Green   │
│ (v1.0) │           │ (v1.1)  │
│ Active │           │ Standby │
└────────┘           └─────────┘

1. Green環境にv1.1デプロイ
2. Green環境でスモークテスト
3. トラフィックをGreenに切替
4. Blue環境を待機（ロールバック用）
```

### 8.2 Rolling Update (Kubernetes)

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # 同時に1つ追加Pod起動
    maxUnavailable: 0  # ダウンタイムなし
```

**デプロイフロー**:
```
初期状態: [v1.0] [v1.0] [v1.0]

ステップ1: [v1.0] [v1.0] [v1.0] [v1.1] (新Pod起動)
ステップ2: [v1.0] [v1.0] [v1.1]        (旧Pod削除)
ステップ3: [v1.0] [v1.1] [v1.1]
ステップ4: [v1.1] [v1.1] [v1.1]        (完了)
```

### 8.3 Canary Deployment

```yaml
# 5%のトラフィックを新バージョンに流す
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: v1.1
      weight: 100
  - route:
    - destination:
        host: api-service
        subset: v1.0
      weight: 95
    - destination:
        host: api-service
        subset: v1.1
      weight: 5
```

---

## 9. ロールバック手順

### 9.1 Kubernetes Rollback

```bash
# 直前のバージョンに戻す
kubectl rollout undo deployment/api-server --namespace=production

# 特定のリビジョンに戻す
kubectl rollout history deployment/api-server --namespace=production
kubectl rollout undo deployment/api-server --to-revision=2 --namespace=production

# ロールバック状態確認
kubectl rollout status deployment/api-server --namespace=production
```

### 9.2 データベースロールバック

```bash
# Prisma Migrateはロールバック非対応
# 手動でダウンマイグレーションSQL実行

psql -h <db_host> -U <user> -d video_platform -f rollback_migration.sql
```

### 9.3 ロールバック判断基準

- エラー率が5%を超える
- API応答時間が500msを超える
- ヘルスチェック失敗率が10%を超える
- スモークテスト失敗

---

## 10. バックアップ・復旧

### 10.1 データベースバックアップ

```bash
# CloudSQL自動バックアップ (毎日3:00 JST)
# Point-in-Time Recovery: 過去7日間の任意時点に復旧可能

# 手動バックアップ
gcloud sql backups create --instance=video-platform-db-prod

# 復旧
gcloud sql backups restore <backup_id> --backup-instance=video-platform-db-prod
```

### 10.2 S3バックアップ

```bash
# S3バージョニング有効化
aws s3api put-bucket-versioning \
  --bucket video-platform-processed-prod \
  --versioning-configuration Status=Enabled

# クロスリージョンレプリケーション
aws s3api put-bucket-replication \
  --bucket video-platform-processed-prod \
  --replication-configuration file://replication.json
```

---

## 11. 関連ドキュメント

- `specs/architecture/system-overview.md` - システム全体構成
- `specs/architecture/tech-stack.md` - 技術スタック詳細
- `specs/architecture/security.md` - セキュリティ対策
- `specs/architecture/monitoring.md` - 監視・ロギング戦略
