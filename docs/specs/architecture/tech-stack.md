# 技術スタック仕様書

## 1. 概要

本ドキュメントでは、動画配信プラットフォームで採用する技術スタックとその選定理由、代替案との比較、および実装における注意点を詳細に記載する。

### 1.1 技術選定の基準

- **成熟度**: 本番環境での実績、コミュニティサポート
- **パフォーマンス**: スケーラビリティ、レスポンスタイム
- **開発生産性**: 学習コスト、エコシステム、ツール
- **保守性**: 長期サポート、アップグレードパス
- **コスト**: ライセンス費用、運用コスト

---

## 2. バックエンド技術スタック

### 2.1 ランタイム: Node.js

**選定技術**: Node.js 20 LTS (Long Term Support)

**選定理由**:
1. **非同期I/O**: 動画配信のような大量の同時接続に最適
2. **JavaScript統一**: フロントエンド(React/Next.js)との言語統一で生産性向上
3. **豊富なエコシステム**: npm パッケージ数 200万+ (2024年時点)
4. **LTS保証**: 2026年4月までサポート保証

**代替案との比較**:

| 項目 | Node.js | Python (FastAPI) | Go | Java (Spring Boot) |
|------|---------|------------------|----|--------------------|
| パフォーマンス | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 開発生産性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| エコシステム | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 非同期処理 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 型安全性 | ⭐⭐⭐⭐ (TS) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 学習コスト | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

**パフォーマンスベンチマーク**:
```
リクエスト数: 10,000 concurrent
- Node.js (Express): 15,000 req/sec
- Python (FastAPI): 8,000 req/sec
- Go (Gin): 25,000 req/sec
- Java (Spring Boot): 12,000 req/sec

※ 実測値はアプリケーションロジックにより変動
```

**採用理由まとめ**:
- フロントエンドとの技術スタック統一による開発効率化
- 非同期I/Oによる高いスループット
- 豊富なnpmパッケージ（Stripe SDK、AWS SDK等）

---

### 2.2 プログラミング言語: TypeScript

**選定技術**: TypeScript 5.x

**選定理由**:
1. **型安全性**: コンパイル時エラー検出でバグ削減
2. **IDE補完**: IntelliSenseによる開発効率向上
3. **大規模開発**: エンタープライズレベルのコードベース管理
4. **JavaScript互換**: 既存JSライブラリをそのまま使用可能

**TypeScript設定例**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**採用理由まとめ**:
- 大規模開発における型安全性
- リファクタリング時の安全性向上
- チーム開発時のコード可読性向上

---

### 2.3 Webフレームワーク: Express.js vs Fastify

**選定技術**: **Fastify 4.x** (推奨)

**比較**:

| 項目 | Express.js | Fastify |
|------|-----------|---------|
| パフォーマンス | 15,000 req/sec | 30,000 req/sec |
| 型サポート | 普通 | 優秀 (TS First) |
| バリデーション | 手動 (express-validator) | 組込 (JSON Schema) |
| エコシステム | 巨大 | 成長中 |
| 学習コスト | 低い | 中程度 |

**Fastify選定理由**:
1. **約2倍のパフォーマンス**: ベンチマーク上Express.jsの2倍
2. **TypeScript First Design**: 型定義が優秀
3. **組み込みバリデーション**: JSON Schemaでリクエスト検証
4. **プラグインアーキテクチャ**: モジュール性が高い

**Fastifyコード例**:
```typescript
import Fastify from 'fastify';

const fastify = Fastify({
  logger: true,
  trustProxy: true,
});

// スキーマベースバリデーション
fastify.post<{
  Body: { email: string; password: string };
  Reply: { accessToken: string };
}>('/api/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  const { email, password } = request.body;
  // ログイン処理
  return { accessToken: 'jwt_token_here' };
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
});
```

**Express.jsを選ぶケース**:
- チームにExpress.js経験者が多い
- 既存のExpress.jsミドルウェアを多用する必要がある

**採用理由まとめ**:
- 高いパフォーマンス要件に対応
- TypeScriptとの親和性が高い
- スキーマベースバリデーションで安全性向上

---

### 2.4 DI Container: InversifyJS vs TSyringe

**選定技術**: **InversifyJS 6.x** (推奨)

**比較**:

| 項目 | InversifyJS | TSyringe |
|------|-------------|----------|
| 型安全性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 機能 | 豊富 (Named Binding, Scope等) | シンプル |
| コミュニティ | 大きい | 中程度 |
| 学習コスト | 高い | 低い |
| デコレータサポート | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**InversifyJS選定理由**:
1. **機能の豊富さ**: Named Binding、Scoped Injection等
2. **大規模プロジェクト実績**: エンタープライズレベルで採用事例多数
3. **完全な型安全性**: TypeScriptとの統合が優秀

**InversifyJSコード例**:
```typescript
// container.ts
import { Container } from 'inversify';
import { IVideoRepository } from './modules/video/domain/repositories/IVideoRepository';
import { VideoRepository } from './modules/video/infrastructure/repositories/VideoRepository';

const container = new Container();

// Repositoryをバインド
container.bind<IVideoRepository>('IVideoRepository').to(VideoRepository).inSingletonScope();

export { container };

// Use Case
import { injectable, inject } from 'inversify';
import 'reflect-metadata';

@injectable()
export class UploadVideoUseCase {
  constructor(
    @inject('IVideoRepository') private videoRepo: IVideoRepository,
    @inject('IStorageService') private storage: IStorageService
  ) {}

  async execute(userId: string, file: File): Promise<void> {
    const video = await this.storage.upload(file);
    await this.videoRepo.save(video);
  }
}
```

**TSyringeを選ぶケース**:
- シンプルなDIで十分な小規模プロジェクト
- 学習コストを下げたい場合

**採用理由まとめ**:
- レイヤードアーキテクチャに最適
- 大規模システムにおけるDI管理
- テスタビリティ向上

---

### 2.5 ORM: TypeORM vs Prisma

**選定技術**: **Prisma 5.x** (推奨)

**比較**:

| 項目 | TypeORM | Prisma |
|------|---------|--------|
| 型安全性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| マイグレーション | 手動管理 | 自動生成 |
| クエリビルダー | 複雑 | シンプル |
| パフォーマンス | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 学習コスト | 高い | 低い |

**Prisma選定理由**:
1. **完全な型安全性**: クエリ結果が完全に型付けされる
2. **自動マイグレーション**: スキーマからマイグレーション自動生成
3. **優秀なDX**: Prisma Studioでデータ可視化
4. **N+1問題自動解決**: Dataloader機能内蔵

**Prismaコード例**:
```typescript
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  password_hash   String
  name            String
  videos          Video[]
  subscriptions   Subscription[]
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@index([email])
}

model Video {
  id          String   @id @default(uuid())
  user_id     String
  user        User     @relation(fields: [user_id], references: [id])
  title       String
  description String?
  view_count  Int      @default(0)
  created_at  DateTime @default(now())

  @@index([user_id, created_at])
}

// Repository実装
import { PrismaClient } from '@prisma/client';

@injectable()
export class VideoRepository implements IVideoRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Video | null> {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        user: true, // リレーション自動ロード
      },
    });

    return video ? Video.fromPrisma(video) : null;
  }

  async findByUserId(userId: string, limit: number = 20): Promise<Video[]> {
    const videos = await this.prisma.video.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return videos.map(v => Video.fromPrisma(v));
  }
}
```

**TypeORMを選ぶケース**:
- Active Recordパターンが好み
- 既存プロジェクトでTypeORM使用中

**採用理由まとめ**:
- 完全な型安全性で開発効率向上
- マイグレーション管理が容易
- N+1問題の自動解決

---

### 2.6 認証: JWT

**選定技術**: jsonwebtoken + bcrypt

**JWT構成**:
```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// パスワードハッシュ化
const SALT_ROUNDS = 12;
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// JWT生成
function generateAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      role,
      plan_id: 'plan_premium',
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

// JWT検証
function verifyAccessToken(token: string): any {
  return jwt.verify(token, process.env.JWT_SECRET!);
}
```

**bcrypt選定理由**:
1. **適応的ハッシュ**: ハードウェア性能向上に対応可能
2. **ソルト内蔵**: レインボーテーブル攻撃防止
3. **業界標準**: 広く使われている実績

**代替案**:
- **Argon2**: より新しく高セキュリティだが、Node.jsでのサポートが限定的
- **scrypt**: Node.js標準だが、bcryptより高速ブルートフォース攻撃に脆弱

**採用理由まとめ**:
- 業界標準のセキュリティ
- コストファクター調整可能
- 豊富な実装事例

---

## 3. データベース

### 3.1 プライマリDB: PostgreSQL 14+

**選定理由**:
1. **ACID準拠**: トランザクション整合性保証
2. **JSON型サポート**: `features`カラム等の柔軟なスキーマ
3. **Full-Text Search**: 日本語全文検索（pg_trgm拡張）
4. **パフォーマンス**: 10万行以上のテーブルでも高速
5. **拡張機能**: PostGIS（位置情報）、pg_stat_statements（分析）

**PostgreSQL拡張機能**:
```sql
-- pg_trgm: 部分一致検索の高速化
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_videos_title_trgm ON videos USING gin(title gin_trgm_ops);

-- uuid-ossp: UUID生成
CREATE EXTENSION "uuid-ossp";
SELECT uuid_generate_v4();

-- pg_stat_statements: スロークエリ分析
CREATE EXTENSION pg_stat_statements;
SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

**代替案との比較**:

| 項目 | PostgreSQL | MySQL | MongoDB |
|------|-----------|-------|---------|
| ACID準拠 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| JSON型 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 全文検索 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| スケーラビリティ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| エコシステム | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**採用理由まとめ**:
- 複雑なトランザクション処理に最適
- JSON型でサブスクプラン機能定義を柔軟に管理
- 豊富な拡張機能

---

### 3.2 キャッシュ: Redis Cluster

**選定技術**: Redis 7.x (Cluster Mode)

**用途**:
1. **セッション管理**: JWTリフレッシュトークン保存
2. **APIキャッシュ**: GETリクエストレスポンスキャッシュ
3. **レート制限**: IPごとのリクエストカウント
4. **Pub/Sub**: ライブチャットのリアルタイム配信

**Redis設定例**:
```typescript
import Redis from 'ioredis';

const redis = new Redis.Cluster([
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
  { host: 'redis-node-3', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
});

// セッション保存（30日間）
await redis.set(`session:${userId}`, JSON.stringify(sessionData), 'EX', 2592000);

// APIキャッシュ（5分間）
await redis.set(`api:videos:${videoId}`, JSON.stringify(video), 'EX', 300);

// レート制限（1分間に100リクエスト）
const key = `ratelimit:${ip}:${endpoint}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);
if (count > 100) throw new Error('Rate limit exceeded');

// Pub/Sub（ライブチャット）
redis.publish(`live:${streamId}:chat`, JSON.stringify(message));
```

**代替案**:
- **Memcached**: より高速だがデータ構造が限定的
- **Hazelcast**: Javaエコシステム向け

**採用理由まとめ**:
- 高速なインメモリDB
- Pub/Sub機能でリアルタイム通信
- データ永続化オプション

---

### 3.3 検索エンジン: Elasticsearch

**選定技術**: Elasticsearch 8.x

**用途**:
1. **全文検索**: 動画タイトル、説明、タグ
2. **おすすめエンジン**: 視聴履歴ベースのレコメンド
3. **トレンド分析**: 視聴数・いいね数の時系列分析

**Elasticsearchインデックス設計**:
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "kuromoji",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "kuromoji"
      },
      "tags": {
        "type": "keyword"
      },
      "category": { "type": "keyword" },
      "view_count": { "type": "integer" },
      "like_count": { "type": "integer" },
      "created_at": { "type": "date" },
      "is_adult": { "type": "boolean" }
    }
  }
}
```

**検索クエリ例**:
```typescript
const result = await esClient.search({
  index: 'videos',
  body: {
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: searchTerm,
              fields: ['title^3', 'description', 'tags^2'],
              fuzziness: 'AUTO',
            },
          },
        ],
        filter: [
          { term: { is_adult: false } }, // アダルトコンテンツ除外
        ],
      },
    },
    sort: [
      { _score: 'desc' },
      { view_count: 'desc' },
    ],
    size: 20,
  },
});
```

**採用理由まとめ**:
- 日本語全文検索（kuromoji tokenizer）
- リアルタイムインデックス更新
- 集計・分析機能が豊富

---

## 4. ストレージ・CDN

### 4.1 ストレージ: AWS S3

**選定理由**:
1. **無制限容量**: ペタバイト級のスケーラビリティ
2. **11 9s耐久性**: 99.999999999%のデータ耐久性
3. **S3 Lifecycle**: 古い動画を自動的にGlacierに移行
4. **Presigned URL**: セキュアなアップロード

**S3バケット構成**:
```
video-platform-uploads-prod/
├── videos/{user_id}/{upload_id}.mp4
├── shorts/{user_id}/{upload_id}.mp4
└── temp-uploads/{upload_id}/

video-platform-processed-prod/
├── videos/{video_id}/
│   ├── 1080p/playlist.m3u8
│   ├── 720p/playlist.m3u8
│   ├── 480p/playlist.m3u8
│   └── 360p/playlist.m3u8
└── thumbnails/{content_id}/

video-platform-live-prod/
└── {stream_id}/{timestamp}.m3u8
```

**代替案**:
- **Google Cloud Storage**: S3と同等、GCP利用時に選択
- **Azure Blob Storage**: S3と同等、Azure利用時に選択

**採用理由まとめ**:
- 最も成熟したオブジェクトストレージ
- AWS他サービスとの統合が容易
- コスト効率が高い

---

### 4.2 CDN: AWS CloudFront

**選定理由**:
1. **グローバルエッジロケーション**: 世界中で低レイテンシ配信
2. **署名付きURL**: セキュアなコンテンツ配信
3. **Origin Shield**: S3への負荷軽減
4. **Lambda@Edge**: エッジでの動的処理

**CloudFront設定例**:
```typescript
import { CloudFrontClient, CreateDistributionCommand } from '@aws-sdk/client-cloudfront';

const distribution = await cloudfront.send(new CreateDistributionCommand({
  DistributionConfig: {
    Origins: {
      Items: [{
        Id: 's3-processed',
        DomainName: 'video-platform-processed-prod.s3.amazonaws.com',
        S3OriginConfig: {
          OriginAccessIdentity: 'origin-access-identity/cloudfront/XXX',
        },
      }],
    },
    DefaultCacheBehavior: {
      TargetOriginId: 's3-processed',
      ViewerProtocolPolicy: 'redirect-to-https',
      MinTTL: 0,
      DefaultTTL: 604800, // 7日
      MaxTTL: 31536000, // 1年
      Compress: true,
      TrustedSigners: {
        Enabled: true,
        Items: [process.env.AWS_ACCOUNT_ID!],
      },
    },
    PriceClass: 'PriceClass_200', // アジア太平洋 + 北米 + 欧州
  },
}));
```

**代替案**:
- **Cloudflare**: より低コスト、DDoS保護が優秀
- **Fastly**: より高機能、高コスト

**採用理由まとめ**:
- S3との統合が容易
- 署名付きURLで権限管理
- グローバルな配信網

---

## 5. 処理系

### 5.1 トランスコード: AWS MediaConvert

**選定理由**:
1. **マネージドサービス**: サーバー管理不要
2. **HLS/DASH対応**: マルチデバイス配信
3. **ABR (Adaptive Bitrate)**: ネットワーク帯域に応じた解像度切り替え
4. **並列処理**: 複数解像度を並列トランスコード

**代替案**:
- **FFmpeg (Lambda/ECS)**: より柔軟だが管理コスト高
- **AWS Elastic Transcoder**: 旧世代、MediaConvertに移行推奨

**採用理由まとめ**:
- フルマネージドで運用コスト低
- HLS形式の自動生成
- コスト効率が高い（従量課金）

---

### 5.2 ライブ配信: AWS MediaLive

**選定理由**:
1. **RTMP Ingest**: OBSからの配信受信
2. **HLS Output**: iOSデバイス対応
3. **Low Latency**: 3秒以下の遅延
4. **Auto Scaling**: 視聴者数に応じた自動スケール

**代替案**:
- **自前RTMP Server (Nginx-RTMP)**: 低コストだが運用負荷高
- **Wowza Streaming Engine**: 高機能だが高コスト

**採用理由まとめ**:
- マネージドサービスで運用容易
- HLS変換自動化
- スケーラビリティ

---

## 6. 決済プロバイダー

### 6.1 Stripe

**選定理由**:
1. **優秀なSDK**: Node.js SDK公式サポート
2. **Webhook充実**: リアルタイム決済イベント通知
3. **日本対応**: 日本円ネイティブサポート
4. **Dashboard**: 管理画面が使いやすい

**Stripe SDK例**:
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// サブスク作成
const subscription = await stripe.subscriptions.create({
  customer: 'cus_xxx',
  items: [{ price: 'price_xxx' }],
  metadata: { user_id: 'usr_123' },
});
```

**採用理由まとめ**:
- 開発者体験が優秀
- グローバル決済対応
- セキュリティ基準（PCI DSS）準拠

---

### 6.2 CCBill

**選定理由**:
1. **アダルトコンテンツ対応**: Stripeでは禁止
2. **年齢確認機能**: クレジットカード情報で年齢確認
3. **実績**: アダルト業界標準

**CCBillコード例**:
```typescript
function createCCBillCheckoutUrl(userId: string, email: string): string {
  const params = new URLSearchParams({
    clientAccnum: process.env.CCBILL_ACCOUNT_ID!,
    clientSubacc: process.env.CCBILL_SUBACCOUNT_ID!,
    initialPrice: '19.80', // USD
    recurringPrice: '19.80',
    custom_user_id: userId,
    email: email,
  });

  return `https://bill.ccbill.com/jpost/signup.cgi?${params.toString()}`;
}
```

**採用理由まとめ**:
- アダルトコンテンツの決済に必須
- 年齢確認機能統合

---

## 7. 外部サービス

### 7.1 メール送信: AWS SES

**選定理由**:
1. **低コスト**: 月62,000通まで無料（EC2内から）
2. **高い到達率**: SPF/DKIM自動設定
3. **バウンス管理**: 自動無効化

**代替案**:
- **SendGrid**: より高機能、コスト高
- **Mailgun**: 同等機能

**採用理由まとめ**:
- AWSエコシステム統合
- コスト効率

---

### 7.2 Push通知: AWS SNS

**選定理由**:
1. **マルチプラットフォーム**: iOS/Android対応
2. **Pub/Sub**: トピック購読型通知
3. **低コスト**: 100万通知/月まで無料

**採用理由まとめ**:
- AWSエコシステム統合
- シンプルなAPI

---

## 8. 開発ツール

### 8.1 コード品質

| ツール | 用途 |
|--------|------|
| **ESLint** | コード静的解析 |
| **Prettier** | コードフォーマット |
| **Husky** | Git Hooks (commit前検証) |
| **lint-staged** | ステージングファイルのみLint |

### 8.2 テスト

| ツール | 用途 |
|--------|------|
| **Jest** | 単体テスト・統合テスト |
| **Supertest** | APIエンドポイントテスト |
| **@testcontainers** | Docker利用のDBテスト |

### 8.3 ドキュメント

| ツール | 用途 |
|--------|------|
| **Swagger/OpenAPI** | API仕様書自動生成 |
| **TypeDoc** | TypeScript型定義ドキュメント |

---

## 9. 技術スタックまとめ

```yaml
Runtime: Node.js 20 LTS
Language: TypeScript 5.x
Framework: Fastify 4.x
DI Container: InversifyJS 6.x
ORM: Prisma 5.x
Authentication: jsonwebtoken + bcrypt

Database:
  Primary: PostgreSQL 14+
  Cache: Redis 7.x Cluster
  Search: Elasticsearch 8.x

Storage:
  Object: AWS S3
  CDN: AWS CloudFront

Processing:
  Transcode: AWS MediaConvert
  Live: AWS MediaLive

Payment:
  General: Stripe
  Adult: CCBill

External:
  Email: AWS SES
  Push: AWS SNS
  Logging: AWS CloudWatch

Development:
  Linter: ESLint
  Formatter: Prettier
  Testing: Jest + Supertest
  API Docs: Swagger/OpenAPI
```

---

## 10. 関連ドキュメント

- `specs/architecture/system-overview.md` - システムアーキテクチャ全体像
- `specs/architecture/deployment.md` - デプロイ戦略
- `specs/architecture/security.md` - セキュリティ詳細
- `specs/references/authentication.md` - JWT実装詳細
- `specs/references/payment-integration.md` - Stripe/CCBill実装詳細
