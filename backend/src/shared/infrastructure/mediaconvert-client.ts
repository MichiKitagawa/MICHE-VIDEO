/**
 * AWS MediaConvert Client Configuration
 *
 * Provides MediaConvert integration for video transcoding.
 */

import {
  MediaConvertClient,
  CreateJobCommand,
  GetJobCommand,
  JobSettings,
  AccelerationSettings,
} from '@aws-sdk/client-mediaconvert';

let mediaConvertClient: MediaConvertClient | null = null;

const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const MEDIACONVERT_ENDPOINT = process.env.MEDIACONVERT_ENDPOINT || '';
const MEDIACONVERT_ROLE_ARN = process.env.MEDIACONVERT_ROLE_ARN || '';
const MEDIACONVERT_QUEUE_ARN = process.env.MEDIACONVERT_QUEUE_ARN || '';

/**
 * Initialize MediaConvert client with configuration from environment.
 */
export function initMediaConvertClient(): MediaConvertClient {
  if (mediaConvertClient) {
    return mediaConvertClient;
  }

  mediaConvertClient = new MediaConvertClient({
    region: AWS_REGION,
    endpoint: MEDIACONVERT_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  return mediaConvertClient;
}

/**
 * Get the existing MediaConvert client instance.
 * @throws Error if client is not initialized
 */
export function getMediaConvertClient(): MediaConvertClient {
  if (!mediaConvertClient) {
    throw new Error('MediaConvert client not initialized. Call initMediaConvertClient() first.');
  }
  return mediaConvertClient;
}

/**
 * Create HLS transcoding job for video
 *
 * @param input - Input S3 path (e.g., s3://bucket/videos/user-id/video.mp4)
 * @param outputPrefix - Output S3 path prefix (e.g., s3://bucket/videos/user-id/video-id/)
 * @param videoId - Video ID for tracking
 * @returns Job ID
 */
export async function createTranscodingJob(
  input: string,
  outputPrefix: string,
  videoId: string
): Promise<string> {
  const client = getMediaConvertClient();

  // HLS output settings for adaptive bitrate streaming
  const jobSettings: JobSettings = {
    Inputs: [
      {
        FileInput: input,
        AudioSelectors: {
          'Audio Selector 1': {
            DefaultSelection: 'DEFAULT',
          },
        },
        VideoSelector: {},
      },
    ],
    OutputGroups: [
      {
        Name: 'Apple HLS',
        OutputGroupSettings: {
          Type: 'HLS_GROUP_SETTINGS',
          HlsGroupSettings: {
            Destination: `${outputPrefix}hls/`,
            SegmentLength: 6,
            MinSegmentLength: 0,
            ManifestDurationFormat: 'INTEGER',
            SegmentControl: 'SEGMENTED_FILES',
            ProgramDateTime: 'EXCLUDE',
            TimedMetadataId3Period: 10,
            CodecSpecification: 'RFC_4281',
            OutputSelection: 'MANIFESTS_AND_SEGMENTS',
            ManifestCompression: 'NONE',
            ClientCache: 'ENABLED',
            StreamInfResolution: 'INCLUDE',
          },
        },
        Outputs: [
          // 1080p output
          {
            NameModifier: '_1080p',
            VideoDescription: {
              Width: 1920,
              Height: 1080,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  QualityTuningLevel: 'SINGLE_PASS_HQ',
                  MaxBitrate: 5000000,
                  Bitrate: 5000000,
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
              M3u8Settings: {},
            },
          },
          // 720p output
          {
            NameModifier: '_720p',
            VideoDescription: {
              Width: 1280,
              Height: 720,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  QualityTuningLevel: 'SINGLE_PASS_HQ',
                  MaxBitrate: 3000000,
                  Bitrate: 3000000,
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
              M3u8Settings: {},
            },
          },
          // 480p output
          {
            NameModifier: '_480p',
            VideoDescription: {
              Width: 854,
              Height: 480,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  QualityTuningLevel: 'SINGLE_PASS_HQ',
                  MaxBitrate: 1500000,
                  Bitrate: 1500000,
                },
              },
            },
            AudioDescriptions: [
              {
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 96000,
                    CodingMode: 'CODING_MODE_2_0',
                    SampleRate: 48000,
                  },
                },
              },
            ],
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {},
            },
          },
        ],
      },
      // Thumbnail output
      {
        Name: 'Thumbnails',
        OutputGroupSettings: {
          Type: 'FILE_GROUP_SETTINGS',
          FileGroupSettings: {
            Destination: `${outputPrefix}thumbnails/`,
          },
        },
        Outputs: [
          {
            NameModifier: '_thumb',
            VideoDescription: {
              Width: 1280,
              Height: 720,
              CodecSettings: {
                Codec: 'FRAME_CAPTURE',
                FrameCaptureSettings: {
                  FramerateNumerator: 1,
                  FramerateDenominator: 10,
                  MaxCaptures: 3,
                  Quality: 80,
                },
              },
            },
            ContainerSettings: {
              Container: 'RAW',
            },
          },
        ],
      },
    ],
  };

  const command = new CreateJobCommand({
    Role: MEDIACONVERT_ROLE_ARN,
    Queue: MEDIACONVERT_QUEUE_ARN,
    Settings: jobSettings,
    UserMetadata: {
      videoId,
    },
    AccelerationSettings: {
      Mode: 'DISABLED', // Can be 'ENABLED' for faster processing (additional cost)
    },
  });

  const response = await client.send(command);

  if (!response.Job?.Id) {
    throw new Error('Failed to create MediaConvert job');
  }

  return response.Job.Id;
}

/**
 * Get job status
 *
 * @param jobId - MediaConvert job ID
 * @returns Job status ('SUBMITTED', 'PROGRESSING', 'COMPLETE', 'ERROR', 'CANCELED')
 */
export async function getJobStatus(jobId: string): Promise<string> {
  const client = getMediaConvertClient();

  const command = new GetJobCommand({
    Id: jobId,
  });

  const response = await client.send(command);

  return response.Job?.Status || 'UNKNOWN';
}

/**
 * Generate S3 input path for MediaConvert
 *
 * @param bucket - S3 bucket name
 * @param key - S3 object key
 * @returns S3 path in MediaConvert format
 */
export function generateMediaConvertInputPath(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`;
}

/**
 * Generate S3 output prefix for MediaConvert
 *
 * @param bucket - S3 bucket name
 * @param videoId - Video ID
 * @param userId - User ID
 * @returns S3 output prefix
 */
export function generateMediaConvertOutputPrefix(
  bucket: string,
  videoId: string,
  userId: string
): string {
  return `s3://${bucket}/videos/${userId}/${videoId}/`;
}
