/**
 * AWS S3 Client Configuration
 *
 * Provides S3 integration for video storage.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || '';

/**
 * Initialize S3 client with configuration from environment.
 */
export function initS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  return s3Client;
}

/**
 * Get the existing S3 client instance.
 * @throws Error if client is not initialized
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Call initS3Client() first.');
  }
  return s3Client;
}

/**
 * Generate a presigned URL for uploading a file to S3.
 *
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Promise<string> - Presigned URL
 */
export async function generateUploadUrl(
  key: string,
  contentType: string = 'video/mp4',
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
}

/**
 * Generate a presigned URL for downloading/viewing a file from S3.
 *
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Promise<string> - Presigned URL
 */
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
}

/**
 * Delete a file from S3.
 *
 * @param key - S3 object key
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
  });

  await client.send(command);
}

/**
 * Generate S3 key for video files.
 *
 * @param userId - User ID
 * @param filename - Original filename
 * @returns string - S3 key
 */
export function generateVideoKey(userId: string, filename: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const extension = filename.split('.').pop() || 'mp4';
  return `videos/${userId}/${timestamp}-${randomStr}.${extension}`;
}

/**
 * Generate S3 key for thumbnail files.
 *
 * @param userId - User ID
 * @param videoId - Video ID
 * @returns string - S3 key
 */
export function generateThumbnailKey(userId: string, videoId: string): string {
  return `thumbnails/${userId}/${videoId}.jpg`;
}
