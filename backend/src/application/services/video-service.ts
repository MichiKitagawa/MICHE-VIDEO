/**
 * Video Service
 *
 * Implements video management use cases (business logic).
 * Reference: docs/specs/features/02-video-upload-management.md
 */

import { injectable, inject } from 'inversify';
import { Video } from '@prisma/client';
import { TYPES } from '@/shared/types';
import {
  IVideoRepository,
  IVideoLikeRepository,
  IVideoCommentRepository,
  IVideoViewRepository,
  IWatchHistoryRepository,
  CreateVideoDto,
  UpdateVideoDto,
  VideoListFilters,
  UpdateProgressDto,
} from '@/modules/video/infrastructure/interfaces';
import { generateUploadUrl, generateVideoKey, generateThumbnailKey } from '@/shared/infrastructure/s3-client';
import {
  createTranscodingJob,
  getJobStatus,
  generateMediaConvertInputPath,
  generateMediaConvertOutputPrefix,
} from '@/shared/infrastructure/mediaconvert-client';

export interface InitiateUploadDto {
  userId: string;
  title: string;
  description?: string;
  categoryId?: string;
  privacy: 'public' | 'unlisted' | 'private';
  isAdult: boolean;
  duration: number;
  filename: string;
}

export interface InitiateUploadResponse {
  videoId: string;
  uploadUrl: string;
  s3Key: string;
}

export interface CreateCommentDto {
  videoId: string;
  userId: string;
  content: string;
  parentId?: string;
}

export interface RecordViewDto {
  videoId: string;
  userId: string | null;
  ipAddress: string;
  duration: number;
}

export interface CompleteUploadDto {
  videoId: string;
  userId: string;
}

@injectable()
export class VideoService {
  constructor(
    @inject(TYPES.VideoRepository) private videoRepo: IVideoRepository,
    @inject(TYPES.VideoLikeRepository) private likeRepo: IVideoLikeRepository,
    @inject(TYPES.VideoCommentRepository) private commentRepo: IVideoCommentRepository,
    @inject(TYPES.VideoViewRepository) private viewRepo: IVideoViewRepository,
    @inject(TYPES.WatchHistoryRepository) private watchHistoryRepo: IWatchHistoryRepository
  ) {}

  /**
   * Initiate video upload
   *
   * Generates presigned S3 URL and creates video record.
   */
  async initiateUpload(dto: InitiateUploadDto): Promise<InitiateUploadResponse> {
    // Generate S3 key for video file
    const s3Key = generateVideoKey(dto.userId, dto.filename);

    // Generate presigned upload URL (1 hour expiration)
    const uploadUrl = await generateUploadUrl(s3Key, 'video/mp4', 3600);

    // Create video record in database
    const video = await this.videoRepo.create({
      userId: dto.userId,
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      privacy: dto.privacy,
      isAdult: dto.isAdult,
      duration: dto.duration,
      s3Key,
    });

    return {
      videoId: video.id,
      uploadUrl,
      s3Key,
    };
  }

  /**
   * Get video by ID
   */
  async getVideoById(videoId: string): Promise<Video | null> {
    return this.videoRepo.findById(videoId);
  }

  /**
   * List videos with filters
   */
  async listVideos(filters: VideoListFilters): Promise<Video[]> {
    return this.videoRepo.findMany(filters);
  }

  /**
   * Update video metadata
   */
  async updateVideo(videoId: string, userId: string, data: UpdateVideoDto): Promise<Video> {
    // Verify ownership
    const video = await this.videoRepo.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }
    if (video.userId !== userId) {
      throw new Error('Unauthorized: Not video owner');
    }

    return this.videoRepo.update(videoId, data);
  }

  /**
   * Delete video
   */
  async deleteVideo(videoId: string, userId: string): Promise<void> {
    // Verify ownership
    const video = await this.videoRepo.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }
    if (video.userId !== userId) {
      throw new Error('Unauthorized: Not video owner');
    }

    await this.videoRepo.delete(videoId);
  }

  /**
   * Like video (toggle)
   */
  async likeVideo(videoId: string, userId: string): Promise<{ liked: boolean }> {
    // Check if already liked
    const existingLike = await this.likeRepo.findByVideoAndUser(videoId, userId);

    if (existingLike) {
      // Unlike
      await this.likeRepo.deleteByVideoAndUser(videoId, userId);
      await this.videoRepo.decrementLikeCount(videoId);
      return { liked: false };
    } else {
      // Like
      await this.likeRepo.create(videoId, userId);
      await this.videoRepo.incrementLikeCount(videoId);
      return { liked: true };
    }
  }

  /**
   * Add comment to video
   */
  async addComment(dto: CreateCommentDto): Promise<any> {
    const comment = await this.commentRepo.create(
      dto.videoId,
      dto.userId,
      dto.content,
      dto.parentId
    );

    // Increment comment count if top-level comment
    if (!dto.parentId) {
      await this.videoRepo.incrementCommentCount(dto.videoId);
    }

    return comment;
  }

  /**
   * Get comments for video
   */
  async getComments(videoId: string, limit?: number, offset?: number): Promise<any[]> {
    return this.commentRepo.findByVideoId(videoId, limit, offset);
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, userId: string, content: string): Promise<any> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new Error('Unauthorized: Not comment owner');
    }

    return this.commentRepo.update(commentId, content);
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new Error('Unauthorized: Not comment owner');
    }

    // Soft delete
    await this.commentRepo.softDelete(commentId);

    // Decrement comment count if top-level comment
    if (!comment.parentId) {
      await this.videoRepo.decrementCommentCount(comment.videoId);
    }
  }

  /**
   * Record video view
   */
  async recordView(dto: RecordViewDto): Promise<void> {
    // Check for recent view (within 30 minutes) to prevent duplicate counting
    const recentView = await this.viewRepo.findRecentView(
      dto.videoId,
      dto.userId,
      dto.ipAddress,
      30
    );

    if (!recentView) {
      // Record new view
      await this.viewRepo.create(dto.videoId, dto.userId, dto.ipAddress, dto.duration);
      await this.videoRepo.incrementViewCount(dto.videoId);
    }
  }

  /**
   * Publish video (make public)
   */
  async publishVideo(videoId: string, userId: string): Promise<Video> {
    const video = await this.videoRepo.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }
    if (video.userId !== userId) {
      throw new Error('Unauthorized: Not video owner');
    }
    if (video.status !== 'ready') {
      throw new Error('Video not ready for publishing');
    }

    return this.videoRepo.update(videoId, {
      publishedAt: new Date(),
    });
  }

  /**
   * Complete upload and start transcoding
   */
  async completeUpload(dto: CompleteUploadDto): Promise<{ message: string; jobId?: string }> {
    const video = await this.videoRepo.findById(dto.videoId);
    if (!video) {
      throw new Error('Video not found');
    }
    if (video.userId !== dto.userId) {
      throw new Error('Unauthorized: Not video owner');
    }
    if (!video.s3Key) {
      throw new Error('Video S3 key not found');
    }

    try {
      // Start transcoding
      const jobId = await this.startTranscoding(video.id, video.userId, video.s3Key);

      return {
        message: 'Transcoding started',
        jobId,
      };
    } catch (error) {
      // Update video status to failed
      await this.videoRepo.update(video.id, {
        status: 'failed',
      });

      throw error;
    }
  }

  /**
   * Start MediaConvert transcoding job
   */
  async startTranscoding(videoId: string, userId: string, s3Key: string): Promise<string> {
    const bucket = process.env.AWS_S3_BUCKET || '';

    // Generate input/output paths
    const inputPath = generateMediaConvertInputPath(bucket, s3Key);
    const outputPrefix = generateMediaConvertOutputPrefix(bucket, videoId, userId);

    // Create MediaConvert job
    const jobId = await createTranscodingJob(inputPath, outputPrefix, videoId);

    return jobId;
  }

  /**
   * Handle transcoding completion webhook
   */
  async handleTranscodingComplete(videoId: string, success: boolean, hlsUrl?: string): Promise<void> {
    if (success && hlsUrl) {
      // Update video status to ready
      await this.videoRepo.update(videoId, {
        status: 'ready',
        hlsUrl,
      });
    } else {
      // Update video status to failed
      await this.videoRepo.update(videoId, {
        status: 'failed',
      });
    }
  }

  /**
   * Get transcoding job status
   */
  async getTranscodingStatus(jobId: string): Promise<string> {
    return getJobStatus(jobId);
  }

  /**
   * Update watch progress
   */
  async updateProgress(data: UpdateProgressDto): Promise<any> {
    // Verify video exists
    const video = await this.videoRepo.findById(data.videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    return this.watchHistoryRepo.upsertProgress(data);
  }

  /**
   * Get watch progress for specific video
   */
  async getProgress(userId: string, videoId: string): Promise<any> {
    return this.watchHistoryRepo.findByUserAndVideo(userId, videoId);
  }

  /**
   * Get user's watch history
   */
  async getWatchHistory(userId: string, limit?: number, offset?: number): Promise<any[]> {
    return this.watchHistoryRepo.findByUserId(userId, limit, offset);
  }

  /**
   * Delete specific watch history entry
   */
  async deleteWatchHistoryEntry(userId: string, videoId: string): Promise<void> {
    await this.watchHistoryRepo.deleteByUserAndVideo(userId, videoId);
  }

  /**
   * Clear all watch history for user
   */
  async clearWatchHistory(userId: string): Promise<{ deletedCount: number }> {
    const deletedCount = await this.watchHistoryRepo.deleteAllByUser(userId);
    return { deletedCount };
  }
}
