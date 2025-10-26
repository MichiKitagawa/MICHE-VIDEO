# External Services Reference

## Overview

This document provides comprehensive details on all third-party integrations, external services, APIs, SDKs, and dependencies used across the video platform.

**Service Categories**: 12 categories
**Total Services**: 20+ external services

---

## 1. Payment Processing

### 1.1 Stripe

**Purpose**: General content subscriptions, tips, SuperChat (non-adult content)

**Integration Type**: REST API + Webhooks + SDK

**SDK Installation**:
```bash
npm install stripe
```

**Configuration**:
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});
```

**Key Features Used**:
- Checkout Sessions (subscriptions)
- Payment Intents (one-time payments)
- Customer management
- Invoice management
- Webhooks (events)

**Endpoints**:
- API Base: `https://api.stripe.com/v1`
- Webhook Base: `https://checkout.stripe.com`
- Dashboard: `https://dashboard.stripe.com`

**Environment Variables**:
```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_SECRET_KEY_TEST=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Rate Limits**:
- 100 requests/second (API)
- Webhooks: Best effort delivery, 3-day retry

**Documentation**: https://stripe.com/docs/api

---

### 1.2 CCBill

**Purpose**: Adult content subscriptions, Premium+ plan

**Integration Type**: HTTP Redirects + Webhooks

**Configuration**:
```bash
CCBILL_ACCOUNT_ID=123456
CCBILL_SUBACCOUNT_ID=0001
CCBILL_FLEXFORMS_ID=abc123def456
CCBILL_SALT=your_salt_key
CCBILL_DATALINK_USERNAME=username
CCBILL_DATALINK_PASSWORD=password
```

**Key Features Used**:
- FlexForms (checkout redirects)
- Webhooks (postbacks)
- Datalink API (subscription management)

**Endpoints**:
- Checkout: `https://bill.ccbill.com/jpost/signup.cgi`
- Datalink: `https://datalink.ccbill.com/data/main.cgi`
- Admin: `https://admin.ccbill.com`

**Webhook Events**:
- NewSaleSuccess
- RenewalSuccess
- RenewalFailure
- Cancellation
- Chargeback

**Documentation**: https://www.ccbill.com/doc

---

## 2. Cloud Infrastructure (AWS)

### 2.1 AWS S3

**Purpose**: File storage (videos, thumbnails, uploads)

**SDK Installation**:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Configuration**:
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

**Buckets**:
- `video-platform-uploads-prod`
- `video-platform-processed-prod`
- `video-platform-thumbnails-prod`
- `video-platform-live-prod`
- `video-platform-backups-prod`

**Environment Variables**:
```bash
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1
S3_UPLOADS_BUCKET=video-platform-uploads-prod
S3_PROCESSED_BUCKET=video-platform-processed-prod
```

**Documentation**: https://docs.aws.amazon.com/s3/

---

### 2.2 AWS MediaConvert

**Purpose**: Video transcoding (HLS/DASH, multiple resolutions)

**SDK Installation**:
```bash
npm install @aws-sdk/client-mediaconvert
```

**Configuration**:
```typescript
import { MediaConvertClient } from '@aws-sdk/client-mediaconvert';

const mediaConvertClient = new MediaConvertClient({
  region: 'ap-northeast-1',
  endpoint: process.env.MEDIACONVERT_ENDPOINT!, // Account-specific
});
```

**Environment Variables**:
```bash
MEDIACONVERT_ENDPOINT=https://xxxxx.mediaconvert.ap-northeast-1.amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::123456789012:role/MediaConvertRole
MEDIACONVERT_QUEUE_ARN=arn:aws:mediaconvert:ap-northeast-1:123456789012:queues/Default
```

**Pricing**: ~$0.015 per minute of output video

**Documentation**: https://docs.aws.amazon.com/mediaconvert/

---

### 2.3 AWS CloudFront

**Purpose**: CDN for video delivery

**Configuration**:
```bash
CLOUDFRONT_DOMAIN=d123.cloudfront.net
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
CLOUDFRONT_OAI_ID=origin-access-identity/cloudfront/ABCDEFG
CLOUDFRONT_KEY_PAIR_ID=APKAXXXXXXXXXXXXXXXX
CLOUDFRONT_PRIVATE_KEY_PATH=/path/to/private-key.pem
```

**Features Used**:
- Origin Access Identity (OAI)
- Signed URLs/Cookies
- Cache invalidation
- Geo-restriction

**Documentation**: https://docs.aws.amazon.com/cloudfront/

---

### 2.4 AWS MediaLive / MediaPackage

**Purpose**: Live streaming (RTMP → HLS)

**SDK Installation**:
```bash
npm install @aws-sdk/client-medialive @aws-sdk/client-mediapackage
```

**Environment Variables**:
```bash
MEDIALIVE_CHANNEL_ARN=arn:aws:medialive:ap-northeast-1:123456789012:channel:1234567
MEDIAPACKAGE_CHANNEL_ID=live-channel-1
MEDIASTORE_ENDPOINT=https://xxxxx.data.mediastore.ap-northeast-1.amazonaws.com
```

**Documentation**: https://docs.aws.amazon.com/medialive/

---

## 3. Database & Caching

### 3.1 PostgreSQL (AWS RDS)

**Purpose**: Primary relational database

**SDK Installation**:
```bash
npm install pg
```

**Configuration**:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Environment Variables**:
```bash
DB_HOST=video-platform-prod.xxxxx.ap-northeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=video_platform
DB_USER=admin
DB_PASSWORD=xxxxxxxxxxxxxxxx
```

**Instance**: db.r5.xlarge (4 vCPU, 32 GB RAM)

**Documentation**: https://www.postgresql.org/docs/

---

### 3.2 Redis (AWS ElastiCache)

**Purpose**: Session storage, rate limiting, caching

**SDK Installation**:
```bash
npm install ioredis
```

**Configuration**:
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

**Environment Variables**:
```bash
REDIS_HOST=video-platform-prod.xxxxx.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxxxxxxxxxxx
```

**Node Type**: cache.r5.large (2 vCPU, 13.07 GB RAM)

**Use Cases**:
- Session storage (JWT blacklist, active sessions)
- Rate limiting (per-user, per-IP)
- Cache (video metadata, user profiles)
- Real-time data (live viewer counts)

**Documentation**: https://redis.io/docs/

---

## 4. Search & Analytics

### 4.1 Elasticsearch (AWS OpenSearch)

**Purpose**: Full-text search (videos, users, channels)

**SDK Installation**:
```bash
npm install @elastic/elasticsearch
```

**Configuration**:
```typescript
import { Client } from '@elastic/elasticsearch';

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
});
```

**Environment Variables**:
```bash
ELASTICSEARCH_URL=https://search-video-platform-xxxxx.ap-northeast-1.es.amazonaws.com
ELASTICSEARCH_USERNAME=admin
ELASTICSEARCH_PASSWORD=xxxxxxxxxxxxxxxx
```

**Indices**:
- `videos` - Video metadata, titles, descriptions
- `users` - User profiles, channel info
- `shorts` - Short video metadata
- `netflix` - Netflix content metadata

**Documentation**: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html

---

### 4.2 Google Analytics

**Purpose**: User behavior tracking, page views

**SDK Installation**:
```bash
npm install react-ga4
```

**Configuration**:
```typescript
import ReactGA from 'react-ga4';

ReactGA.initialize(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!);
```

**Environment Variables**:
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Events Tracked**:
- Page views
- Video plays
- Subscription conversions
- Search queries
- Tips sent

**Documentation**: https://developers.google.com/analytics

---

## 5. Email & Notifications

### 5.1 SendGrid

**Purpose**: Transactional emails (verification, notifications)

**SDK Installation**:
```bash
npm install @sendgrid/mail
```

**Configuration**:
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
```

**Environment Variables**:
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@platform.com
SENDGRID_FROM_NAME=Video Platform
```

**Email Templates**:
- Email verification
- Password reset
- Subscription confirmation
- Payment failed
- Tip received
- Transcoding complete

**Rate Limits**: 100 emails/second (paid plan)

**Documentation**: https://docs.sendgrid.com/

---

### 5.2 Firebase Cloud Messaging (FCM)

**Purpose**: Push notifications (mobile apps)

**SDK Installation**:
```bash
npm install firebase-admin
```

**Configuration**:
```typescript
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
```

**Environment Variables**:
```bash
FIREBASE_PROJECT_ID=video-platform-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@video-platform-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Notification Types**:
- New upload from followed creator
- Live stream started
- Comment reply
- Tip received
- Subscription renewal

**Documentation**: https://firebase.google.com/docs/cloud-messaging

---

## 6. Real-Time Communication

### 6.1 WebSocket (Socket.io)

**Purpose**: Live chat, real-time updates

**SDK Installation**:
```bash
npm install socket.io socket.io-client
```

**Server Configuration**:
```typescript
import { Server } from 'socket.io';

const io = new Server(server, {
  cors: {
    origin: process.env.APP_URL,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_live_stream', (streamId) => {
    socket.join(`live_${streamId}`);
  });

  socket.on('send_chat_message', async (data) => {
    // Broadcast to all viewers
    io.to(`live_${data.streamId}`).emit('chat_message', data);
  });
});
```

**Events**:
- `join_live_stream` - User joins live stream room
- `leave_live_stream` - User leaves room
- `send_chat_message` - Send chat message
- `chat_message` - Receive chat message
- `superchat` - SuperChat notification
- `viewer_count_update` - Update viewer count

**Documentation**: https://socket.io/docs/

---

### 6.2 Agora (Video Calling - Future)

**Purpose**: Video calls, screensharing (future feature)

**SDK Installation**:
```bash
npm install agora-rtc-sdk-ng
```

**Documentation**: https://docs.agora.io/

---

## 7. Authentication & OAuth

### 7.1 Google OAuth 2.0

**Purpose**: Google Sign-In

**SDK Installation**:
```bash
npm install next-auth
```

**Configuration**:
```typescript
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
};
```

**Environment Variables**:
```bash
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

**Scopes**: `openid`, `email`, `profile`

**Documentation**: https://developers.google.com/identity/protocols/oauth2

---

### 7.2 Apple Sign In

**Purpose**: Apple Sign-In (iOS)

**Configuration**:
```bash
APPLE_CLIENT_ID=com.platform.video
APPLE_TEAM_ID=ABCDE12345
APPLE_KEY_ID=FGHIJ67890
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_FGHIJ67890.p8
```

**Documentation**: https://developer.apple.com/sign-in-with-apple/

---

### 7.3 Twitter OAuth 2.0

**Purpose**: Twitter Sign-In

**Configuration**:
```bash
TWITTER_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Documentation**: https://developer.twitter.com/en/docs/authentication/oauth-2-0

---

## 8. Content Moderation

### 8.1 AWS Rekognition

**Purpose**: Adult content detection, face detection

**SDK Installation**:
```bash
npm install @aws-sdk/client-rekognition
```

**Configuration**:
```typescript
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';

const rekognitionClient = new RekognitionClient({ region: 'ap-northeast-1' });
```

**Use Cases**:
- Adult content detection (nudity, violence)
- Face detection (thumbnail optimization)
- Object detection (content categorization)

**Documentation**: https://docs.aws.amazon.com/rekognition/

---

### 8.2 ClamAV (Virus Scanning)

**Purpose**: Virus/malware scanning for uploads

**Installation**:
```bash
# Lambda Layer or Docker
apt-get install clamav clamav-daemon
freshclam # Update virus definitions
```

**Usage**:
```bash
clamscan /path/to/uploaded/file
```

**Documentation**: https://www.clamav.net/documents

---

## 9. Logging & Monitoring

### 9.1 AWS CloudWatch

**Purpose**: Application logs, metrics, alarms

**SDK Installation**:
```bash
npm install @aws-sdk/client-cloudwatch-logs
```

**Configuration**:
```typescript
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const cwClient = new CloudWatchLogsClient({ region: 'ap-northeast-1' });
```

**Log Groups**:
- `/aws/lambda/video-transcoding`
- `/ecs/video-platform-api`
- `/ecs/video-platform-worker`

**Metrics**:
- API response times
- Error rates
- Video upload counts
- Transcoding queue length

**Documentation**: https://docs.aws.amazon.com/cloudwatch/

---

### 9.2 Sentry

**Purpose**: Error tracking and monitoring

**Frontend SDK Installation (Expo Router)**:
```bash
npx expo install @sentry/react-native
```

**Frontend Configuration (Expo Router)**:
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 10000,
});
```

**Backend SDK Installation (Node.js)**:
```bash
npm install @sentry/node
```

**Backend Configuration (Fastify)**:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**Environment Variables**:
```bash
# Frontend (Expo)
EXPO_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o123456.ingest.sentry.io/1234567

# Backend (Node.js)
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o123456.ingest.sentry.io/7654321
SENTRY_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Documentation**: https://docs.sentry.io/

---

### 9.3 Datadog (Optional)

**Purpose**: Advanced monitoring, APM

**SDK Installation**:
```bash
npm install dd-trace
```

**Configuration**:
```typescript
import tracer from 'dd-trace';

tracer.init({
  service: 'video-platform-api',
  env: process.env.NODE_ENV,
});
```

**Documentation**: https://docs.datadoghq.com/

---

## 10. CDN & Edge

### 10.1 Cloudflare (DNS + DDoS Protection)

**Purpose**: DNS management, DDoS protection

**Configuration**:
```bash
CLOUDFLARE_ZONE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Features Used**:
- DNS management
- DDoS protection (L3/L4/L7)
- Rate limiting
- Page rules

**Documentation**: https://developers.cloudflare.com/

---

## 11. Queue & Job Processing

### 11.1 AWS SQS

**Purpose**: Job queues (transcoding, email sending)

**SDK Installation**:
```bash
npm install @aws-sdk/client-sqs
```

**Configuration**:
```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: 'ap-northeast-1' });
```

**Queues**:
- `video-transcoding-queue` - Video transcoding jobs
- `email-queue` - Email sending jobs
- `notification-queue` - Push notification jobs
- `analytics-queue` - Analytics event processing

**Documentation**: https://docs.aws.amazon.com/sqs/

---

### 11.2 BullMQ (Redis-based)

**Purpose**: Job scheduling, retry logic

**SDK Installation**:
```bash
npm install bullmq
```

**Configuration**:
```typescript
import { Queue, Worker } from 'bullmq';

const transcodingQueue = new Queue('transcoding', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

const worker = new Worker('transcoding', async (job) => {
  await transcodVideo(job.data.mediaFileId);
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});
```

**Documentation**: https://docs.bullmq.io/

---

## 12. Miscellaneous

### 12.1 IP Geolocation

**Purpose**: Country detection for geo-restrictions

**SDK Installation**:
```bash
npm install @maxmind/geoip2-node
```

**Service**: MaxMind GeoIP2

**Documentation**: https://www.maxmind.com/en/geoip2-services-and-databases

---

### 12.2 CAPTCHA (reCAPTCHA)

**Purpose**: Bot prevention (registration, comments)

**SDK Installation**:
```bash
npm install react-google-recaptcha
```

**Configuration**:
```bash
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RECAPTCHA_SECRET_KEY=6LeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Documentation**: https://developers.google.com/recaptcha

---

## Environment Variables Summary

**Complete `.env` file**:
```bash
# Application
NODE_ENV=production
APP_URL=https://platform.com
JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database
DB_HOST=video-platform-prod.xxxxx.ap-northeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=video_platform
DB_USER=admin
DB_PASSWORD=xxxxxxxxxxxxxxxx

# Redis
REDIS_HOST=video-platform-prod.xxxxx.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxxxxxxxxxxx

# AWS
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1

# S3
S3_UPLOADS_BUCKET=video-platform-uploads-prod
S3_PROCESSED_BUCKET=video-platform-processed-prod

# CloudFront
CLOUDFRONT_DOMAIN=d123.cloudfront.net
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
CLOUDFRONT_KEY_PAIR_ID=APKAXXXXXXXXXXXXXXXX
CLOUDFRONT_PRIVATE_KEY_PATH=/secrets/cloudfront-private-key.pem

# MediaConvert
MEDIACONVERT_ENDPOINT=https://xxxxx.mediaconvert.ap-northeast-1.amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::123456789012:role/MediaConvertRole
MEDIACONVERT_QUEUE_ARN=arn:aws:mediaconvert:ap-northeast-1:123456789012:queues/Default

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# CCBill
CCBILL_ACCOUNT_ID=123456
CCBILL_SUBACCOUNT_ID=0001
CCBILL_FLEXFORMS_ID=abc123def456
CCBILL_SALT=your_salt_key

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@platform.com

# Firebase
FIREBASE_PROJECT_ID=video-platform-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@video-platform-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# Elasticsearch
ELASTICSEARCH_URL=https://search-video-platform-xxxxx.ap-northeast-1.es.amazonaws.com
ELASTICSEARCH_USERNAME=admin
ELASTICSEARCH_PASSWORD=xxxxxxxxxxxxxxxx

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o123456.ingest.sentry.io/1234567

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Related Documents

- `specs/features/02-subscription.md` - Stripe/CCBill integration
- `specs/features/03-content-delivery.md` - AWS MediaConvert, S3, CloudFront
- `specs/references/payment-integration.md` - Payment provider details
- `specs/references/content-delivery.md` - CDN and streaming infrastructure
- `specs/references/file-storage.md` - S3 bucket architecture
