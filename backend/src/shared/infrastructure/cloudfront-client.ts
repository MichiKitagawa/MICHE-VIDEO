/**
 * AWS CloudFront Client Configuration
 *
 * Provides CloudFront integration for secure content delivery.
 */

import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';
const CLOUDFRONT_KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID || '';
const CLOUDFRONT_PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY || '';

/**
 * Generate signed CloudFront URL for video streaming
 *
 * @param s3Key - S3 object key (e.g., "videos/user-id/video-id/hls/master.m3u8")
 * @param expiresIn - URL expiration time in seconds (default: 86400 = 24 hours)
 * @returns Signed CloudFront URL
 */
export function generateSignedStreamUrl(
  s3Key: string,
  expiresIn: number = 86400
): string {
  if (!CLOUDFRONT_DOMAIN || !CLOUDFRONT_KEY_PAIR_ID || !CLOUDFRONT_PRIVATE_KEY) {
    throw new Error('CloudFront configuration missing');
  }

  const url = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
  const dateLessThan = new Date(Date.now() + expiresIn * 1000).toISOString();

  try {
    const signedUrl = getSignedUrl({
      url,
      keyPairId: CLOUDFRONT_KEY_PAIR_ID,
      privateKey: CLOUDFRONT_PRIVATE_KEY,
      dateLessThan,
    });

    return signedUrl;
  } catch (error) {
    console.error('Failed to generate signed CloudFront URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Generate signed CloudFront URL for thumbnail
 *
 * @param s3Key - S3 object key for thumbnail
 * @param expiresIn - URL expiration time in seconds (default: 86400 = 24 hours)
 * @returns Signed CloudFront URL
 */
export function generateSignedThumbnailUrl(
  s3Key: string,
  expiresIn: number = 86400
): string {
  return generateSignedStreamUrl(s3Key, expiresIn);
}

/**
 * Generate HLS master playlist URL from video ID
 *
 * @param userId - User ID
 * @param videoId - Video ID
 * @param expiresIn - URL expiration time in seconds
 * @returns Signed CloudFront URL for HLS master playlist
 */
export function generateHlsUrl(
  userId: string,
  videoId: string,
  expiresIn: number = 86400
): string {
  const s3Key = `videos/${userId}/${videoId}/hls/master.m3u8`;
  return generateSignedStreamUrl(s3Key, expiresIn);
}

/**
 * Extract S3 key from HLS URL
 *
 * @param hlsUrl - Full HLS URL (S3 or CloudFront)
 * @returns S3 key
 */
export function extractS3KeyFromUrl(hlsUrl: string): string {
  try {
    const url = new URL(hlsUrl);
    // Remove leading slash
    return url.pathname.substring(1);
  } catch {
    // If not a valid URL, assume it's already an S3 key
    return hlsUrl;
  }
}

/**
 * Check if CloudFront is configured
 *
 * @returns boolean
 */
export function isCloudFrontConfigured(): boolean {
  return !!(CLOUDFRONT_DOMAIN && CLOUDFRONT_KEY_PAIR_ID && CLOUDFRONT_PRIVATE_KEY);
}

/**
 * Get CloudFront domain
 *
 * @returns CloudFront domain or empty string
 */
export function getCloudFrontDomain(): string {
  return CLOUDFRONT_DOMAIN;
}
