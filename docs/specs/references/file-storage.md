# File Storage Reference

## Overview

This document provides comprehensive details on file storage architecture, S3/GCS bucket design, lifecycle policies, access control, versioning, and storage class optimization for the video platform.

**Storage Providers**: AWS S3 (primary), Google Cloud Storage (backup/redundancy)
**Content Types**: Videos, Shorts, Live recordings, Thumbnails, User uploads
**Storage Classes**: Standard, Intelligent-Tiering, Glacier

---

## 1. Storage Architecture

### 1.1 Bucket Structure

```
AWS S3 Buckets (ap-northeast-1):

1. video-platform-uploads-prod
   Purpose: Original user uploads (temporary)
   Lifecycle: Delete after 30 days (after transcoding)
   Encryption: SSE-S3
   Versioning: Disabled
   Public Access: Blocked

2. video-platform-processed-prod
   Purpose: Transcoded videos (HLS/DASH outputs)
   Lifecycle: Intelligent-Tiering (auto-archive after 90 days)
   Encryption: SSE-S3
   Versioning: Enabled
   Public Access: Blocked (CloudFront OAI only)

3. video-platform-thumbnails-prod
   Purpose: Video thumbnails and preview images
   Lifecycle: Standard (frequently accessed)
   Encryption: SSE-S3
   Versioning: Disabled
   Public Access: Blocked (CloudFront OAI only)

4. video-platform-live-prod
   Purpose: Live stream recordings
   Lifecycle: Standard → Glacier after 7 days
   Encryption: SSE-S3
   Versioning: Disabled
   Public Access: Blocked

5. video-platform-user-avatars-prod
   Purpose: User profile images, channel banners
   Lifecycle: Standard
   Encryption: SSE-S3
   Versioning: Disabled
   Public Access: Read-only via CloudFront

6. video-platform-backups-prod
   Purpose: Database backups, logs
   Lifecycle: Glacier Instant Retrieval (immediate)
   Encryption: SSE-KMS
   Versioning: Enabled
   Public Access: Blocked
```

### 1.2 Directory Structure

**video-platform-uploads-prod**:
```
/videos/
  /{user_id}/
    /{upload_id}_{original_filename}

/shorts/
  /{user_id}/
    /{upload_id}_{original_filename}

/temp-uploads/
  /{upload_id}/
    /part-000001
    /part-000002
    ...
```

**video-platform-processed-prod**:
```
/videos/
  /{video_id}/
    /master.m3u8            # Master playlist
    /1080p/
      /playlist.m3u8
      /segment000.ts
      /segment001.ts
      ...
    /720p/
      /playlist.m3u8
      /segment000.ts
      ...
    /480p/
      /playlist.m3u8
      ...
    /360p/
      /playlist.m3u8
      ...

/shorts/
  /{short_id}/
    /master.m3u8
    /1080p/
      /playlist.m3u8
      /segment000.ts
      ...
    /720p/
      ...
    /480p/
      ...

/netflix/
  /{content_id}/
    /{episode_id}/
      /master.m3u8
      /1080p/
        ...
      /4k/
        ...
```

**video-platform-thumbnails-prod**:
```
/videos/
  /{video_id}/
    /0.jpg              # Frame at 0s
    /50.jpg             # Frame at 50% duration
    /100.jpg            # Frame at 100% duration
    /custom.jpg         # User-uploaded thumbnail

/shorts/
  /{short_id}/
    /frame.jpg          # Auto-generated from first frame

/netflix/
  /{content_id}/
    /poster.jpg         # Movie/series poster
    /backdrop.jpg       # Backdrop image
```

**video-platform-live-prod**:
```
/streams/
  /{stream_id}/
    /{timestamp}.m3u8
    /segment-{timestamp}-000.ts
    /segment-{timestamp}-001.ts
    ...

/recordings/
  /{stream_id}/
    /full-recording.mp4  # Archived full stream
```

---

## 2. S3 Bucket Configuration

### 2.1 Bucket Creation (Terraform)

```hcl
# video-platform-uploads-prod
resource "aws_s3_bucket" "uploads" {
  bucket = "video-platform-uploads-prod"
  region = "ap-northeast-1"

  tags = {
    Environment = "production"
    Purpose     = "user-uploads"
  }
}

resource "aws_s3_bucket_encryption" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "delete-old-uploads"
    status = "Enabled"

    expiration {
      days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = [
      "https://platform.com",
      "https://*.platform.com"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
```

```hcl
# video-platform-processed-prod
resource "aws_s3_bucket" "processed" {
  bucket = "video-platform-processed-prod"
  region = "ap-northeast-1"

  tags = {
    Environment = "production"
    Purpose     = "transcoded-videos"
  }
}

resource "aws_s3_bucket_versioning" "processed" {
  bucket = aws_s3_bucket.processed.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_intelligent_tiering_configuration" "processed" {
  bucket = aws_s3_bucket.processed.id
  name   = "auto-archive"

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "processed" {
  bucket = aws_s3_bucket.processed.id

  rule {
    id     = "transition-to-intelligent-tiering"
    status = "Enabled"

    transition {
      days          = 0
      storage_class = "INTELLIGENT_TIERING"
    }
  }

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
```

### 2.2 Bucket Policies

**Allow CloudFront OAI Access**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity E1234567890ABC"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::video-platform-processed-prod/*"
    }
  ]
}
```

**Allow MediaConvert Access**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowMediaConvertRead",
      "Effect": "Allow",
      "Principal": {
        "Service": "mediaconvert.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::video-platform-uploads-prod/*"
    },
    {
      "Sid": "AllowMediaConvertWrite",
      "Effect": "Allow",
      "Principal": {
        "Service": "mediaconvert.amazonaws.com"
      },
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::video-platform-processed-prod/*"
    }
  ]
}
```

---

## 3. Access Control

### 3.1 IAM Roles

**Application Server Role**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::video-platform-uploads-prod/*",
        "arn:aws:s3:::video-platform-thumbnails-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::video-platform-processed-prod/*"
      ]
    }
  ]
}
```

**Transcoding Lambda/ECS Role**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::video-platform-uploads-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::video-platform-processed-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "mediaconvert:CreateJob",
        "mediaconvert:GetJob",
        "mediaconvert:DescribeEndpoints"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3.2 Presigned URLs

**Generate Upload Presigned URL**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function generateUploadPresignedUrl(
  fileName: string,
  contentType: string,
  userId: string
): Promise<string> {
  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  const key = `videos/${userId}/${Date.now()}_${fileName}`;

  const command = new PutObjectCommand({
    Bucket: 'video-platform-uploads-prod',
    Key: key,
    ContentType: contentType,
    Metadata: {
      'user-id': userId,
      'original-filename': fileName,
    },
    // Optional: Server-side encryption
    ServerSideEncryption: 'AES256',
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });

  return url;
}
```

**Generate Download Presigned URL**:
```typescript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function generateDownloadPresignedUrl(
  s3Key: string,
  expiresIn: number = 86400 // 24 hours
): Promise<string> {
  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  const command = new GetObjectCommand({
    Bucket: 'video-platform-processed-prod',
    Key: s3Key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  return url;
}
```

---

## 4. Lifecycle Policies

### 4.1 Automated Archival

**Intelligent-Tiering for Processed Videos**:
- **Frequent Access Tier**: First 30 days (Standard)
- **Infrequent Access Tier**: 30-90 days (saves ~50% cost)
- **Archive Access Tier**: 90-180 days (saves ~68% cost)
- **Deep Archive Access Tier**: 180+ days (saves ~95% cost)

**Configuration**:
```typescript
import { S3Client, PutBucketIntelligentTieringConfigurationCommand } from '@aws-sdk/client-s3';

async function configureIntelligentTiering() {
  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  const command = new PutBucketIntelligentTieringConfigurationCommand({
    Bucket: 'video-platform-processed-prod',
    Id: 'auto-archive-videos',
    IntelligentTieringConfiguration: {
      Id: 'auto-archive-videos',
      Status: 'Enabled',
      Tierings: [
        {
          Days: 90,
          AccessTier: 'ARCHIVE_ACCESS',
        },
        {
          Days: 180,
          AccessTier: 'DEEP_ARCHIVE_ACCESS',
        },
      ],
    },
  });

  await s3Client.send(command);
}
```

### 4.2 Deletion Policies

**Delete Temporary Uploads**:
```json
{
  "Rules": [
    {
      "Id": "delete-old-uploads",
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      },
      "Filter": {
        "Prefix": ""
      }
    },
    {
      "Id": "cleanup-incomplete-multipart",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

**Delete Soft-Deleted Content** (after 30-day recovery period):
```typescript
// Cron job: daily cleanup
async function cleanupDeletedContent() {
  const deletedContent = await db.query(`
    SELECT storage_path FROM media_files
    WHERE status = 'deleted' AND deleted_at < NOW() - INTERVAL '30 days'
  `);

  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  for (const item of deletedContent) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: 'video-platform-processed-prod',
        Key: item.storage_path,
      })
    );

    await db.query('UPDATE media_files SET status = $1 WHERE storage_path = $2', [
      'permanently_deleted',
      item.storage_path,
    ]);
  }
}
```

---

## 5. Versioning & Recovery

### 5.1 Object Versioning

**Enable Versioning** (processed videos only):
```typescript
import { S3Client, PutBucketVersioningCommand } from '@aws-sdk/client-s3';

async function enableVersioning() {
  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  const command = new PutBucketVersioningCommand({
    Bucket: 'video-platform-processed-prod',
    VersioningConfiguration: {
      Status: 'Enabled',
    },
  });

  await s3Client.send(command);
}
```

**Restore Previous Version**:
```typescript
import { S3Client, ListObjectVersionsCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

async function restorePreviousVersion(key: string, versionId: string) {
  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  // Copy old version to become current version
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: 'video-platform-processed-prod',
      CopySource: `video-platform-processed-prod/${key}?versionId=${versionId}`,
      Key: key,
    })
  );
}
```

### 5.2 Cross-Region Replication (Disaster Recovery)

**Enable Replication to us-west-2**:
```hcl
resource "aws_s3_bucket_replication_configuration" "processed" {
  bucket = aws_s3_bucket.processed.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-to-us-west-2"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.processed_replica.arn
      storage_class = "STANDARD_IA"

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    filter {}
  }
}
```

---

## 6. Storage Optimization

### 6.1 Cost Optimization

**Storage Class Comparison**:

| Storage Class | Cost (per GB/month) | Use Case |
|---------------|---------------------|----------|
| Standard | $0.023 | Frequently accessed (first 30 days) |
| Intelligent-Tiering | $0.023 - $0.0125 | Auto-optimize (30+ days) |
| Standard-IA | $0.0125 | Infrequently accessed (30-90 days) |
| Glacier Instant Retrieval | $0.004 | Archive with instant retrieval (90+ days) |
| Glacier Flexible Retrieval | $0.0036 | Archive with 1-12 hour retrieval (180+ days) |
| Glacier Deep Archive | $0.00099 | Long-term archive (365+ days) |

**Estimated Monthly Costs** (10TB storage):
- All Standard: $230/month
- Intelligent-Tiering: $150/month (35% savings)
- 50% Glacier Instant: $135/month (41% savings)

### 6.2 Compression

**Enable Compression for Text-Based Files**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { gzipSync } from 'zlib';

async function uploadCompressedPlaylist(playlistContent: string, key: string) {
  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  const compressed = gzipSync(playlistContent);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: 'video-platform-processed-prod',
      Key: key,
      Body: compressed,
      ContentType: 'application/vnd.apple.mpegurl',
      ContentEncoding: 'gzip',
    })
  );
}
```

### 6.3 Deduplication

**Content-Addressed Storage** (hash-based):
```typescript
import crypto from 'crypto';

function generateContentHash(fileBuffer: Buffer): string {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function uploadWithDeduplication(fileBuffer: Buffer, userId: string) {
  const hash = generateContentHash(fileBuffer);

  // Check if file already exists
  const existing = await db.query(
    'SELECT storage_path FROM media_files WHERE content_hash = $1',
    [hash]
  );

  if (existing) {
    // Reuse existing file
    return existing.storage_path;
  }

  // Upload new file
  const key = `videos/${userId}/${hash}`;
  await uploadToS3(key, fileBuffer);

  await db.query(
    'INSERT INTO media_files (user_id, storage_path, content_hash) VALUES ($1, $2, $3)',
    [userId, key, hash]
  );

  return key;
}
```

---

## 7. Monitoring & Metrics

### 7.1 CloudWatch Metrics

**Storage Metrics**:
```typescript
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';

async function getStorageMetrics(bucketName: string) {
  const cloudwatch = new CloudWatchClient({ region: 'ap-northeast-1' });

  const command = new GetMetricStatisticsCommand({
    Namespace: 'AWS/S3',
    MetricName: 'BucketSizeBytes',
    Dimensions: [
      { Name: 'BucketName', Value: bucketName },
      { Name: 'StorageType', Value: 'StandardStorage' },
    ],
    StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    EndTime: new Date(),
    Period: 3600, // 1 hour intervals
    Statistics: ['Average'],
  });

  const response = await cloudwatch.send(command);
  return response.Datapoints;
}
```

### 7.2 S3 Access Logs

**Enable Server Access Logging**:
```hcl
resource "aws_s3_bucket_logging" "processed" {
  bucket = aws_s3_bucket.processed.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/processed/"
}
```

**Analyze Logs with Athena**:
```sql
CREATE EXTERNAL TABLE s3_access_logs (
  bucket string,
  time string,
  remote_ip string,
  requester string,
  request_id string,
  operation string,
  key string,
  request_uri string,
  http_status int,
  error_code string,
  bytes_sent bigint,
  object_size bigint,
  total_time int,
  turn_around_time int,
  referrer string,
  user_agent string
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe'
WITH SERDEPROPERTIES (
  'serialization.format' = '1',
  'input.regex' = '([^ ]*) ([^ ]*) \\[(.*?)\\] ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (\"[^\"]*\"|-) (-|[0-9]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (\"[^\"]*\"|-) (\"[^\"]*\"|-)'
)
LOCATION 's3://video-platform-logs/s3-access-logs/';
```

---

## 8. Security

### 8.1 Encryption at Rest

**SSE-S3** (default):
```typescript
await s3Client.send(
  new PutObjectCommand({
    Bucket: 'video-platform-processed-prod',
    Key: key,
    Body: fileBuffer,
    ServerSideEncryption: 'AES256',
  })
);
```

**SSE-KMS** (for sensitive data):
```typescript
await s3Client.send(
  new PutObjectCommand({
    Bucket: 'video-platform-backups-prod',
    Key: key,
    Body: fileBuffer,
    ServerSideEncryption: 'aws:kms',
    SSEKMSKeyId: process.env.KMS_KEY_ID!,
  })
);
```

### 8.2 Encryption in Transit

**Enforce HTTPS-Only**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::video-platform-processed-prod/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

### 8.3 Virus Scanning

**Scan Uploads with ClamAV**:
```typescript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import fs from 'fs';

async function scanUploadedFile(s3Key: string) {
  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  // Download file
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: 'video-platform-uploads-prod',
      Key: s3Key,
    })
  );

  const tempFile = `/tmp/${Date.now()}_scan`;
  fs.writeFileSync(tempFile, await response.Body.transformToByteArray());

  // Scan with ClamAV
  try {
    execSync(`clamscan ${tempFile}`);
    // Clean
    return { clean: true };
  } catch (error) {
    // Infected
    return { clean: false, error: 'Virus detected' };
  } finally {
    fs.unlinkSync(tempFile);
  }
}
```

---

## 9. Backup & Disaster Recovery

### 9.1 Automated Backups

**Daily Database Backups to S3**:
```bash
#!/bin/bash
# Backup PostgreSQL to S3

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"

pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /tmp/$BACKUP_FILE

aws s3 cp /tmp/$BACKUP_FILE s3://video-platform-backups-prod/database/$BACKUP_FILE

rm /tmp/$BACKUP_FILE
```

### 9.2 Cross-Region Replication

**Replicate critical data to secondary region**:
- Primary: ap-northeast-1 (Tokyo)
- Secondary: us-west-2 (Oregon)

**RTO (Recovery Time Objective)**: 1 hour
**RPO (Recovery Point Objective)**: 15 minutes

---

## Related Documents

- `specs/features/03-content-delivery.md` - Content delivery feature spec
- `specs/references/content-delivery.md` - CDN and streaming infrastructure
- `specs/references/business-rules.md` - Storage quotas and limits
