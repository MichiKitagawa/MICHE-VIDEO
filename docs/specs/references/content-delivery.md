# Content Delivery Reference

## Overview

This document provides comprehensive technical details for content delivery infrastructure including upload workflows, transcoding pipelines, CDN distribution, HLS/DASH streaming, and adaptive bitrate (ABR) strategies.

**Components**: S3 Storage, AWS MediaConvert, CloudFront CDN, HLS/DASH streaming
**Content Types**: Videos, Shorts, Live Streams, Netflix content

---

## 1. Architecture Overview

### 1.1 Content Delivery Flow

```
[User Upload] → [S3 Presigned URL] → [S3 Origin Bucket]
                                            ↓
                                    [SNS/SQS Event]
                                            ↓
                                  [MediaConvert/FFmpeg]
                                            ↓
                          [Transcoded Files (Multiple Resolutions)]
                                            ↓
                                    [S3 Output Bucket]
                                            ↓
                                  [CloudFront CDN]
                                            ↓
                            [Signed URL with 24h expiry]
                                            ↓
                              [User Video Player (HLS)]
```

### 1.2 Storage Architecture

```
S3 Buckets:
├── video-platform-uploads-prod/           # Original uploads
│   ├── videos/{user_id}/{upload_id}.mp4
│   ├── shorts/{user_id}/{upload_id}.mp4
│   └── temp-uploads/{upload_id}/          # Multipart uploads
│
├── video-platform-processed-prod/         # Transcoded outputs
│   ├── videos/{video_id}/
│   │   ├── 1080p/playlist.m3u8
│   │   ├── 720p/playlist.m3u8
│   │   ├── 480p/playlist.m3u8
│   │   └── 360p/playlist.m3u8
│   ├── shorts/{short_id}/
│   │   ├── 1080p/playlist.m3u8
│   │   ├── 720p/playlist.m3u8
│   │   └── 480p/playlist.m3u8
│   └── thumbnails/{content_id}/
│       ├── 0.jpg    # Start frame
│       ├── 50.jpg   # Middle frame
│       └── 100.jpg  # End frame
│
└── video-platform-live-prod/              # Live stream recordings
    └── {stream_id}/{timestamp}.m3u8
```

---

## 2. Upload Workflow

### 2.1 Presigned URL Upload

**Step 1: Initiate Upload**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: 'ap-northeast-1' });

async function initiateUpload(
  userId: string,
  fileName: string,
  fileSize: number,
  contentType: string
) {
  // Validate file size and type
  validateUpload(userId, fileSize, contentType);

  // Generate unique upload ID
  const uploadId = `upl_${Date.now()}_${randomUUID()}`;
  const storagePath = `videos/${userId}/${uploadId}_${fileName}`;

  // Create presigned URL (valid for 1 hour)
  const command = new PutObjectCommand({
    Bucket: process.env.S3_UPLOADS_BUCKET!,
    Key: storagePath,
    ContentType: contentType,
    Metadata: {
      user_id: userId,
      upload_id: uploadId,
      original_filename: fileName,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });

  // Create media_file record
  const mediaFile = await db.query(`
    INSERT INTO media_files (
      user_id, content_type, file_type, storage_provider,
      storage_path, file_size, mime_type, status
    ) VALUES ($1, 'video', 'original', 's3', $2, $3, $4, 'uploading')
    RETURNING id
  `, [userId, storagePath, fileSize, contentType]);

  return {
    upload_id: uploadId,
    upload_url: uploadUrl,
    media_file_id: mediaFile.id,
    expires_in: 3600,
  };
}
```

**Step 2: Client-Side Upload**:
```typescript
// React component for file upload
import { useState } from 'react';
import axios from 'axios';

function VideoUploader() {
  const [progress, setProgress] = useState(0);

  async function uploadFile(file: File) {
    // 1. Initiate upload
    const { upload_url, media_file_id } = await fetch('/api/upload/initiate', {
      method: 'POST',
      body: JSON.stringify({
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        media_type: 'video',
      }),
    }).then(res => res.json());

    // 2. Upload directly to S3 with progress tracking
    await axios.put(upload_url, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(percentCompleted);
      },
    });

    // 3. Notify server of completion
    await fetch('/api/upload/complete', {
      method: 'POST',
      body: JSON.stringify({
        media_file_id,
      }),
    });

    return media_file_id;
  }

  return (
    <div>
      <input type="file" accept="video/*" onChange={e => uploadFile(e.target.files[0])} />
      <progress value={progress} max={100} />
    </div>
  );
}
```

### 2.2 Multipart Upload (Large Files)

**For files >100MB**:
```typescript
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client } from '@aws-sdk/client-s3';

async function multipartUpload(file: File, onProgress: (percent: number) => void) {
  const s3Client = new S3Client({ region: 'ap-northeast-1' });

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_UPLOADS_BUCKET!,
      Key: `videos/${userId}/${uploadId}_${file.name}`,
      Body: file,
      ContentType: file.type,
    },
    queueSize: 4, // concurrent parts
    partSize: 10 * 1024 * 1024, // 10MB per part
  });

  upload.on('httpUploadProgress', (progress) => {
    if (progress.loaded && progress.total) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      onProgress(percent);
    }
  });

  await upload.done();
}
```

### 2.3 Upload Validation

```typescript
function validateUpload(userId: string, fileSize: number, contentType: string) {
  const user = getUserSubscription(userId);

  // File size limits
  const maxSize = {
    free: 0, // Free users cannot upload
    premium: 2 * 1024 * 1024 * 1024, // 2GB
    premium_plus: 5 * 1024 * 1024 * 1024, // 5GB
  };

  if (fileSize > maxSize[user.plan_id]) {
    throw new Error('file_too_large');
  }

  // Content type validation
  const allowedTypes = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    'video/webm',
  ];

  if (!allowedTypes.includes(contentType)) {
    throw new Error('invalid_file_format');
  }

  // Check concurrent uploads
  const activeUploads = await db.query(`
    SELECT COUNT(*) FROM media_files
    WHERE user_id = $1 AND status IN ('uploading', 'processing')
  `, [userId]);

  const maxConcurrent = {
    free: 0,
    premium: 3,
    premium_plus: 5,
  };

  if (activeUploads >= maxConcurrent[user.plan_id]) {
    throw new Error('concurrent_upload_limit_exceeded');
  }
}
```

---

## 3. Transcoding Pipeline

### 3.1 AWS MediaConvert Integration

**Trigger Transcoding on Upload Complete**:
```typescript
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';

const mediaConvertClient = new MediaConvertClient({
  region: 'ap-northeast-1',
  endpoint: process.env.MEDIACONVERT_ENDPOINT!, // Account-specific endpoint
});

async function createTranscodingJob(mediaFileId: string) {
  const mediaFile = await db.query(
    'SELECT * FROM media_files WHERE id = $1',
    [mediaFileId]
  );

  const inputPath = `s3://${process.env.S3_UPLOADS_BUCKET}/${mediaFile.storage_path}`;
  const outputPath = `s3://${process.env.S3_PROCESSED_BUCKET}/videos/${mediaFile.content_id}/`;

  const jobSettings = {
    Role: process.env.MEDIACONVERT_ROLE_ARN!,
    Settings: {
      Inputs: [
        {
          FileInput: inputPath,
          AudioSelectors: {
            'Audio Selector 1': {
              DefaultSelection: 'DEFAULT',
            },
          },
          VideoSelector: {},
        },
      ],
      OutputGroups: [
        // HLS 1080p
        createHLSOutputGroup('1080p', 5000000, 1920, 1080, outputPath),
        // HLS 720p
        createHLSOutputGroup('720p', 2500000, 1280, 720, outputPath),
        // HLS 480p
        createHLSOutputGroup('480p', 1000000, 854, 480, outputPath),
        // HLS 360p
        createHLSOutputGroup('360p', 500000, 640, 360, outputPath),
        // Thumbnails
        createThumbnailOutputGroup(outputPath),
      ],
    },
    Queue: process.env.MEDIACONVERT_QUEUE_ARN!,
  };

  const command = new CreateJobCommand(jobSettings);
  const response = await mediaConvertClient.send(command);

  // Store transcoding job
  await db.query(`
    INSERT INTO transcoding_jobs (
      media_file_id, job_type, status, external_job_id
    ) VALUES ($1, 'video', 'queued', $2)
  `, [mediaFileId, response.Job.Id]);

  // Update media file status
  await db.query(
    'UPDATE media_files SET status = $1 WHERE id = $2',
    ['processing', mediaFileId]
  );

  return response.Job.Id;
}

function createHLSOutputGroup(
  resolution: string,
  bitrate: number,
  width: number,
  height: number,
  outputPath: string
) {
  return {
    Name: `HLS ${resolution}`,
    OutputGroupSettings: {
      Type: 'HLS_GROUP_SETTINGS',
      HlsGroupSettings: {
        Destination: `${outputPath}${resolution}/`,
        SegmentLength: 6, // 6-second segments
        MinSegmentLength: 0,
        ManifestDurationFormat: 'INTEGER',
        SegmentControl: 'SEGMENTED_FILES',
      },
    },
    Outputs: [
      {
        VideoDescription: {
          Width: width,
          Height: height,
          CodecSettings: {
            Codec: 'H_264',
            H264Settings: {
              Bitrate: bitrate,
              RateControlMode: 'CBR',
              CodecProfile: 'MAIN',
              CodecLevel: 'LEVEL_4',
              MaxBitrate: bitrate,
            },
          },
        },
        AudioDescriptions: [
          {
            CodecSettings: {
              Codec: 'AAC',
              AacSettings: {
                Bitrate: 128000,
                CodingMode: 'CODING_MODE_2_0',
                SampleRate: 48000,
              },
            },
          },
        ],
        ContainerSettings: {
          Container: 'M3U8',
        },
      },
    ],
  };
}

function createThumbnailOutputGroup(outputPath: string) {
  return {
    Name: 'Thumbnails',
    OutputGroupSettings: {
      Type: 'FILE_GROUP_SETTINGS',
      FileGroupSettings: {
        Destination: `${outputPath}thumbnails/`,
      },
    },
    Outputs: [
      {
        VideoDescription: {
          Width: 1280,
          Height: 720,
          CodecSettings: {
            Codec: 'FRAME_CAPTURE',
            FrameCaptureSettings: {
              FramerateNumerator: 1,
              FramerateDenominator: 60, // 1 frame every 60 seconds
              MaxCaptures: 3,
              Quality: 80,
            },
          },
        },
        ContainerSettings: {
          Container: 'RAW',
        },
        NameModifier: '_thumb',
      },
    ],
  };
}
```

### 3.2 Monitor Transcoding Progress

**AWS EventBridge + Lambda**:
```typescript
// Lambda function triggered by MediaConvert status changes
export async function handleMediaConvertEvent(event: any) {
  const { detail } = event;
  const jobId = detail.jobId;
  const status = detail.status; // SUBMITTED, PROGRESSING, COMPLETE, ERROR

  // Find transcoding job in database
  const job = await db.query(
    'SELECT * FROM transcoding_jobs WHERE external_job_id = $1',
    [jobId]
  );

  if (status === 'COMPLETE') {
    // Update job status
    await db.query(`
      UPDATE transcoding_jobs
      SET status = 'completed', progress = 100, completed_at = NOW()
      WHERE id = $1
    `, [job.id]);

    // Update media file
    await db.query(`
      UPDATE media_files
      SET status = 'ready'
      WHERE id = $1
    `, [job.media_file_id]);

    // Notify user
    await sendTranscodingCompleteNotification(job.media_file_id);

  } else if (status === 'ERROR') {
    // Handle error
    await db.query(`
      UPDATE transcoding_jobs
      SET status = 'failed', error_message = $1
      WHERE id = $2
    `, [detail.errorMessage, job.id]);

    // Retry logic (max 3 attempts)
    const attempts = await db.query(
      'SELECT COUNT(*) FROM transcoding_jobs WHERE media_file_id = $1',
      [job.media_file_id]
    );

    if (attempts < 3) {
      // Retry transcoding
      await createTranscodingJob(job.media_file_id);
    } else {
      // Give up, notify user
      await db.query(
        'UPDATE media_files SET status = $1 WHERE id = $2',
        ['failed', job.media_file_id]
      );
      await sendTranscodingFailedNotification(job.media_file_id);
    }

  } else if (status === 'PROGRESSING') {
    // Update progress
    const progress = detail.jobProgress?.jobPercentComplete || 0;
    await db.query(
      'UPDATE transcoding_jobs SET progress = $1 WHERE id = $2',
      [progress, job.id]
    );
  }
}
```

### 3.3 Fallback: FFmpeg on Lambda/ECS

**For custom transcoding or small files**:
```typescript
import { spawn } from 'child_process';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

async function transcodWithFFmpeg(
  inputS3Path: string,
  outputS3Path: string,
  resolution: string
) {
  const s3 = new S3Client({ region: 'ap-northeast-1' });

  // Download input file from S3
  const input = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.S3_UPLOADS_BUCKET!,
      Key: inputS3Path,
    })
  );

  const inputStream = input.Body as Readable;

  // FFmpeg command
  const ffmpegArgs = [
    '-i', 'pipe:0', // Read from stdin
    '-vf', `scale=-2:${getHeight(resolution)}`, // Scale to resolution
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-b:v', getBitrate(resolution),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-f', 'hls',
    'pipe:1', // Output to stdout
  ];

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);
  inputStream.pipe(ffmpeg.stdin);

  const chunks: Buffer[] = [];
  ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', resolve);
    ffmpeg.on('error', reject);
  });

  // Upload output to S3
  const outputBuffer = Buffer.concat(chunks);
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_PROCESSED_BUCKET!,
      Key: outputS3Path,
      Body: outputBuffer,
    })
  );
}

function getHeight(resolution: string): number {
  const heights = { '1080p': 1080, '720p': 720, '480p': 480, '360p': 360 };
  return heights[resolution];
}

function getBitrate(resolution: string): string {
  const bitrates = {
    '1080p': '5000k',
    '720p': '2500k',
    '480p': '1000k',
    '360p': '500k',
  };
  return bitrates[resolution];
}
```

---

## 4. CDN Distribution

### 4.1 CloudFront Configuration

**CloudFront Distribution Settings**:
```typescript
import { CloudFrontClient, CreateDistributionCommand } from '@aws-sdk/client-cloudfront';

async function createCloudFrontDistribution() {
  const cloudfront = new CloudFrontClient({ region: 'us-east-1' });

  const command = new CreateDistributionCommand({
    DistributionConfig: {
      CallerReference: `video-platform-${Date.now()}`,
      Comment: 'Video platform CDN',
      Enabled: true,

      // Origin: S3 bucket with OAI (Origin Access Identity)
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: 's3-processed-videos',
            DomainName: `${process.env.S3_PROCESSED_BUCKET}.s3.ap-northeast-1.amazonaws.com`,
            S3OriginConfig: {
              OriginAccessIdentity: `origin-access-identity/cloudfront/${process.env.CLOUDFRONT_OAI_ID}`,
            },
          },
        ],
      },

      // Default cache behavior
      DefaultCacheBehavior: {
        TargetOriginId: 's3-processed-videos',
        ViewerProtocolPolicy: 'redirect-to-https',
        AllowedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD'],
        },
        CachedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD'],
        },
        ForwardedValues: {
          QueryString: true, // For signed URLs
          Cookies: {
            Forward: 'none',
          },
        },
        MinTTL: 0,
        DefaultTTL: 604800, // 7 days
        MaxTTL: 31536000, // 1 year
        Compress: true,
        TrustedSigners: {
          Enabled: true,
          Quantity: 1,
          Items: [process.env.AWS_ACCOUNT_ID!],
        },
      },

      // Price class (optimize for Asia Pacific + Global)
      PriceClass: 'PriceClass_200',

      // Geo restriction (optional)
      Restrictions: {
        GeoRestriction: {
          RestrictionType: 'none',
        },
      },

      // SSL certificate
      ViewerCertificate: {
        CloudFrontDefaultCertificate: true,
      },
    },
  });

  const response = await cloudfront.send(command);
  return response.Distribution.DomainName;
}
```

### 4.2 Signed URLs for Content Protection

```typescript
import { getSignedUrl as cloudfrontGetSignedUrl } from '@aws-sdk/cloudfront-signer';
import { readFileSync } from 'fs';

function generateSignedCDNUrl(
  objectKey: string, // e.g., videos/vid_123/1080p/playlist.m3u8
  expiresIn: number = 86400 // 24 hours
): string {
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN!; // e.g., d123.cloudfront.net
  const url = `https://${cloudfrontDomain}/${objectKey}`;

  const privateKey = readFileSync(process.env.CLOUDFRONT_PRIVATE_KEY_PATH!, 'utf8');
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID!;

  const signedUrl = cloudfrontGetSignedUrl({
    url,
    keyPairId,
    privateKey,
    dateLessThan: new Date(Date.now() + expiresIn * 1000).toISOString(),
  });

  return signedUrl;
}

// API endpoint
async function getVideoStreamUrl(videoId: string, userId: string) {
  // Check permissions
  const video = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

  if (video.requires_premium && user.plan_id === 'free') {
    throw new Error('subscription_required');
  }

  if (video.is_adult && !user.has_adult_access) {
    throw new Error('premium_plus_required');
  }

  // Generate signed URLs for all available resolutions
  const resolutions = ['1080p', '720p', '480p', '360p'];
  const streams = [];

  for (const resolution of resolutions) {
    const objectKey = `videos/${videoId}/${resolution}/playlist.m3u8`;
    const signedUrl = generateSignedCDNUrl(objectKey, 86400);

    streams.push({
      quality: resolution,
      url: signedUrl,
      bitrate: getBitrateForResolution(resolution),
    });
  }

  return {
    video_id: videoId,
    streams,
    thumbnail_url: generateSignedCDNUrl(`thumbnails/${videoId}/0.jpg`, 86400),
    expires_in: 86400,
  };
}
```

---

## 5. Streaming Protocols

### 5.1 HLS (HTTP Live Streaming)

**Master Playlist** (adaptive bitrate):
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480
480p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360
360p/playlist.m3u8
```

**Variant Playlist** (720p example):
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:6.0,
segment000.ts
#EXTINF:6.0,
segment001.ts
#EXTINF:6.0,
segment002.ts
...
#EXT-X-ENDLIST
```

### 5.2 DASH (Dynamic Adaptive Streaming over HTTP)

**Optional for broader device support**:
```xml
<?xml version="1.0"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static">
  <Period>
    <AdaptationSet mimeType="video/mp4" codecs="avc1.4d401f">
      <Representation id="1080p" bandwidth="5000000" width="1920" height="1080">
        <BaseURL>1080p/</BaseURL>
        <SegmentTemplate media="segment$Number$.m4s" initialization="init.mp4" />
      </Representation>
      <Representation id="720p" bandwidth="2500000" width="1280" height="720">
        <BaseURL>720p/</BaseURL>
        <SegmentTemplate media="segment$Number$.m4s" initialization="init.mp4" />
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>
```

### 5.3 ABR (Adaptive Bitrate) Client-Side

**Video.js with HLS**:
```typescript
import videojs from 'video.js';
import 'videojs-contrib-quality-levels';
import 'videojs-hls-quality-selector';

function VideoPlayer({ streamUrl }: { streamUrl: string }) {
  useEffect(() => {
    const player = videojs('my-video', {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      html5: {
        vhs: {
          overrideNative: true,
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
        },
      },
      plugins: {
        qualitySelector: {
          default: 'auto',
        },
      },
    });

    player.src({
      src: streamUrl,
      type: 'application/x-mpegURL',
    });

    // Monitor bandwidth and adjust quality
    player.on('loadedmetadata', () => {
      const qualityLevels = player.qualityLevels();

      // Start with lowest quality for fast startup
      qualityLevels.selectedIndex_ = qualityLevels.length - 1;

      // Auto-switch based on bandwidth
      player.on('bandwidthupdate', () => {
        const bandwidth = player.tech({ IWillNotUseThisInPlugins: true }).vhs.bandwidth;
        const bestQuality = findBestQuality(qualityLevels, bandwidth);
        qualityLevels.selectedIndex_ = bestQuality;
      });
    });

    return () => player.dispose();
  }, [streamUrl]);

  return <video id="my-video" className="video-js" />;
}

function findBestQuality(qualityLevels: any, bandwidth: number): number {
  for (let i = 0; i < qualityLevels.length; i++) {
    if (qualityLevels[i].bitrate <= bandwidth * 0.8) {
      return i;
    }
  }
  return qualityLevels.length - 1; // Lowest quality fallback
}
```

---

## 6. Performance Optimization

### 6.1 CDN Caching Strategy

**Cache Headers**:
```typescript
// S3 object metadata for transcoded videos
const cacheControl = {
  // Immutable content (video segments)
  segments: 'public, max-age=31536000, immutable', // 1 year

  // Playlist files (may update)
  playlists: 'public, max-age=604800', // 7 days

  // Thumbnails
  thumbnails: 'public, max-age=2592000', // 30 days
};
```

**CloudFront Invalidation** (when content updates):
```typescript
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

async function invalidateCDNCache(paths: string[]) {
  const cloudfront = new CloudFrontClient({ region: 'us-east-1' });

  const command = new CreateInvalidationCommand({
    DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID!,
    InvalidationBatch: {
      CallerReference: `invalidation-${Date.now()}`,
      Paths: {
        Quantity: paths.length,
        Items: paths, // e.g., ['/videos/vid_123/*']
      },
    },
  });

  await cloudfront.send(command);
}
```

### 6.2 Origin Shield

**Enable CloudFront Origin Shield** to reduce load on S3:
```typescript
// CloudFront distribution config
OriginShield: {
  Enabled: true,
  OriginShieldRegion: 'ap-northeast-1', // Same as S3 bucket region
}
```

### 6.3 Compression

**Enable Gzip/Brotli** for text-based files (playlists):
```typescript
// CloudFront behavior
Compress: true, // Automatic gzip compression
```

---

## 7. DRM (Digital Rights Management)

### 7.1 Widevine/FairPlay/PlayReady

**For Netflix content only**:
```typescript
import { MediaPackageClient, CreateOriginEndpointCommand } from '@aws-sdk/client-mediapackage';

async function createDRMProtectedEndpoint(videoId: string) {
  const mediaPackage = new MediaPackageClient({ region: 'ap-northeast-1' });

  const command = new CreateOriginEndpointCommand({
    ChannelId: 'netflix-channel',
    Id: `endpoint-${videoId}`,
    ManifestName: 'index',
    HlsPackage: {
      Encryption: {
        EncryptionMethod: 'SAMPLE_AES',
        SpekeKeyProvider: {
          Url: process.env.DRM_KEY_PROVIDER_URL!,
          ResourceId: videoId,
          SystemIds: [
            'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed', // Widevine
            '94ce86fb-07ff-4f43-adb8-93d2fa968ca2', // FairPlay
            '9a04f079-9840-4286-ab92-e65be0885f95', // PlayReady
          ],
        },
      },
    },
  });

  const response = await mediaPackage.send(command);
  return response.Url;
}
```

---

## 8. Live Streaming

### 8.1 RTMP Ingest → HLS Output

**AWS MediaLive Configuration**:
```typescript
import { MediaLiveClient, CreateChannelCommand } from '@aws-sdk/client-medialive';

async function createLiveChannel(streamId: string) {
  const medialive = new MediaLiveClient({ region: 'ap-northeast-1' });

  const command = new CreateChannelCommand({
    Name: `live-${streamId}`,
    InputSpecification: {
      Codec: 'AVC',
      MaximumBitrate: 'MAX_10_MBPS',
      Resolution: 'HD',
    },
    Destinations: [
      {
        Id: 'mediapackage',
        Settings: [
          {
            Url: `mediastoressl://${process.env.MEDIASTORE_ENDPOINT}/live/${streamId}/index`,
          },
        ],
      },
    ],
    EncoderSettings: {
      OutputGroups: [
        {
          Name: 'HLS Output',
          OutputGroupSettings: {
            HlsGroupSettings: {
              Destination: {
                DestinationRefId: 'mediapackage',
              },
              SegmentLength: 6,
            },
          },
          Outputs: [
            {
              VideoDescriptionName: '1080p',
              AudioDescriptionNames: ['audio_1'],
            },
            {
              VideoDescriptionName: '720p',
              AudioDescriptionNames: ['audio_1'],
            },
          ],
        },
      ],
      VideoDescriptions: [
        {
          Name: '1080p',
          Width: 1920,
          Height: 1080,
          CodecSettings: {
            H264Settings: {
              Bitrate: 5000000,
              RateControlMode: 'CBR',
            },
          },
        },
        {
          Name: '720p',
          Width: 1280,
          Height: 720,
          CodecSettings: {
            H264Settings: {
              Bitrate: 2500000,
              RateControlMode: 'CBR',
            },
          },
        },
      ],
      AudioDescriptions: [
        {
          Name: 'audio_1',
          CodecSettings: {
            AacSettings: {
              Bitrate: 128000,
              SampleRate: 48000,
            },
          },
        },
      ],
    },
  });

  const response = await medialive.send(command);
  return response.Channel;
}
```

**RTMP Push URL**:
```
rtmp://live.platform.com/app/{stream_key}
```

---

## Related Documents

- `specs/features/03-content-delivery.md` - Content delivery feature spec
- `specs/references/file-storage.md` - S3 bucket architecture
- `specs/references/business-rules.md` - Upload limits and restrictions
- `specs/references/api-endpoints.md` - Upload and streaming endpoints
