/**
 * Video Controller
 *
 * Handles HTTP requests for video management endpoints.
 * Reference: docs/specs/references/api-endpoints.md
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/shared/types';
import { VideoService } from '@/application/services/video-service';
import { verifyAccessToken } from '@/modules/auth/domain/jwt-service';

interface InitiateUploadBody {
  title: string;
  description?: string;
  categoryId?: string;
  privacy: 'public' | 'unlisted' | 'private';
  isAdult: boolean;
  duration: number;
  filename: string;
}

interface UpdateVideoBody {
  title?: string;
  description?: string;
  categoryId?: string;
  privacy?: 'public' | 'unlisted' | 'private';
  isAdult?: boolean;
  thumbnailUrl?: string;
  hlsUrl?: string;
  status?: 'processing' | 'ready' | 'failed';
}

interface CreateCommentBody {
  content: string;
  parentId?: string;
}

interface ListVideosQuery {
  userId?: string;
  categoryId?: string;
  privacy?: string;
  isAdult?: boolean;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount';
  orderDirection?: 'asc' | 'desc';
}

interface VideoIdParams {
  id: string;
}

interface CommentIdParams {
  commentId: string;
}

@injectable()
export class VideoController {
  constructor(
    @inject(TYPES.VideoService) private videoService: VideoService
  ) {}

  /**
   * POST /api/videos/upload
   * Initiate video upload (get presigned URL)
   */
  async initiateUpload(
    request: FastifyRequest<{ Body: InitiateUploadBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const result = await this.videoService.initiateUpload({
        userId,
        ...request.body,
      });

      reply.code(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload initiation failed';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/videos
   * List videos with filters
   */
  async listVideos(
    request: FastifyRequest<{ Querystring: ListVideosQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const isAdultQuery = request.query.isAdult;
      const filters = {
        ...request.query,
        isAdult: isAdultQuery !== undefined
          ? (isAdultQuery === true || String(isAdultQuery) === 'true')
          : undefined,
        limit: request.query.limit ? Number(request.query.limit) : 20,
        offset: request.query.offset ? Number(request.query.offset) : 0,
      };

      const videos = await this.videoService.listVideos(filters);

      reply.send({
        success: true,
        data: videos,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list videos';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/videos/:id
   * Get video by ID
   */
  async getVideo(
    request: FastifyRequest<{ Params: VideoIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const video = await this.videoService.getVideoById(request.params.id);

      if (!video) {
        return reply.code(404).send({
          success: false,
          error: 'Video not found',
        });
      }

      reply.send({
        success: true,
        data: video,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get video';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PATCH /api/videos/:id
   * Update video metadata
   */
  async updateVideo(
    request: FastifyRequest<{ Params: VideoIdParams; Body: UpdateVideoBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const video = await this.videoService.updateVideo(
        request.params.id,
        userId,
        request.body
      );

      reply.send({
        success: true,
        data: video,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update video';
      const statusCode = message.includes('Unauthorized') ? 403 : 400;
      reply.code(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * DELETE /api/videos/:id
   * Delete video
   */
  async deleteVideo(
    request: FastifyRequest<{ Params: VideoIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      await this.videoService.deleteVideo(request.params.id, userId);

      reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete video';
      const statusCode = message.includes('Unauthorized') ? 403 : 400;
      reply.code(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/videos/:id/like
   * Like/unlike video (toggle)
   */
  async likeVideo(
    request: FastifyRequest<{ Params: VideoIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const result = await this.videoService.likeVideo(request.params.id, userId);

      reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to like video';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/videos/:id/comments
   * Add comment to video
   */
  async addComment(
    request: FastifyRequest<{ Params: VideoIdParams; Body: CreateCommentBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const comment = await this.videoService.addComment({
        videoId: request.params.id,
        userId,
        content: request.body.content,
        parentId: request.body.parentId,
      });

      reply.code(201).send({
        success: true,
        data: comment,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add comment';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/videos/:id/comments
   * Get comments for video
   */
  async getComments(
    request: FastifyRequest<{ Params: VideoIdParams; Querystring: { limit?: number; offset?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const limit = request.query.limit ? Number(request.query.limit) : 20;
      const offset = request.query.offset ? Number(request.query.offset) : 0;

      const comments = await this.videoService.getComments(request.params.id, limit, offset);

      reply.send({
        success: true,
        data: comments,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get comments';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PATCH /api/videos/:id/comments/:commentId
   * Update comment
   */
  async updateComment(
    request: FastifyRequest<{ Params: VideoIdParams & CommentIdParams; Body: { content: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const comment = await this.videoService.updateComment(
        request.params.commentId,
        userId,
        request.body.content
      );

      reply.send({
        success: true,
        data: comment,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update comment';
      const statusCode = message.includes('Unauthorized') ? 403 : 400;
      reply.code(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * DELETE /api/videos/:id/comments/:commentId
   * Delete comment
   */
  async deleteComment(
    request: FastifyRequest<{ Params: VideoIdParams & CommentIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      await this.videoService.deleteComment(request.params.commentId, userId);

      reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete comment';
      const statusCode = message.includes('Unauthorized') ? 403 : 400;
      reply.code(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/videos/:id/view
   * Record video view
   */
  async recordView(
    request: FastifyRequest<{ Params: VideoIdParams; Body: { duration: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT (optional - can be anonymous)
      const authHeader = request.headers.authorization;
      let userId: string | null = null;

      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const decoded = verifyAccessToken(token);
          userId = decoded.sub;
        } catch {
          // Ignore JWT errors for view tracking (allow anonymous views)
        }
      }

      // Get IP address
      const ipAddress = request.ip;

      await this.videoService.recordView({
        videoId: request.params.id,
        userId,
        ipAddress,
        duration: request.body.duration,
      });

      reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record view';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/videos/:id/publish
   * Publish video
   */
  async publishVideo(
    request: FastifyRequest<{ Params: VideoIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const video = await this.videoService.publishVideo(request.params.id, userId);

      reply.send({
        success: true,
        data: video,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish video';
      const statusCode = message.includes('Unauthorized') ? 403 : 400;
      reply.code(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/videos/:id/complete
   * Complete upload and start transcoding
   */
  async completeUpload(
    request: FastifyRequest<{ Params: VideoIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const result = await this.videoService.completeUpload({
        videoId: request.params.id,
        userId,
      });

      reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete upload';
      const statusCode = message.includes('Unauthorized') ? 403 : 400;
      reply.code(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/webhooks/mediaconvert
   * MediaConvert webhook handler
   */
  async handleMediaConvertWebhook(
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const event: any = request.body;

      // Parse MediaConvert event
      if (event.detail?.status === 'COMPLETE' && event.detail?.userMetadata?.videoId) {
        const videoId = event.detail.userMetadata.videoId;
        const outputGroupDetails = event.detail.outputGroupDetails || [];

        // Find HLS output
        let hlsUrl: string | undefined;
        for (const group of outputGroupDetails) {
          if (group.type === 'HLS_GROUP' && group.outputDetails?.[0]?.outputFilePaths?.[0]) {
            hlsUrl = group.outputDetails[0].outputFilePaths[0];
            break;
          }
        }

        await this.videoService.handleTranscodingComplete(videoId, true, hlsUrl);
      } else if (event.detail?.status === 'ERROR' && event.detail?.userMetadata?.videoId) {
        const videoId = event.detail.userMetadata.videoId;
        await this.videoService.handleTranscodingComplete(videoId, false);
      }

      reply.code(200).send({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      reply.code(500).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/videos/:id/transcoding-status
   * Get transcoding status
   */
  async getTranscodingStatus(
    request: FastifyRequest<{ Params: VideoIdParams; Querystring: { jobId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { jobId } = request.query;

      if (!jobId) {
        return reply.code(400).send({
          success: false,
          error: 'Job ID required',
        });
      }

      const status = await this.videoService.getTranscodingStatus(jobId);

      reply.send({
        success: true,
        data: { status },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get transcoding status';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/videos/:id/progress
   * Update watch progress
   */
  async updateProgress(
    request: FastifyRequest<{ Params: VideoIdParams; Body: { progressSeconds: number; durationSeconds?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const result = await this.videoService.updateProgress({
        userId,
        videoId: request.params.id,
        progressSeconds: request.body.progressSeconds,
        durationSeconds: request.body.durationSeconds,
      });

      reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update progress';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/videos/:id/progress
   * Get watch progress
   */
  async getProgress(
    request: FastifyRequest<{ Params: VideoIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const result = await this.videoService.getProgress(userId, request.params.id);

      reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get progress';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/watch-history
   * Get user's watch history
   */
  async getWatchHistory(
    request: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const limit = request.query.limit ? Number(request.query.limit) : 20;
      const offset = request.query.offset ? Number(request.query.offset) : 0;

      const result = await this.videoService.getWatchHistory(userId, limit, offset);

      reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get watch history';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * DELETE /api/watch-history/:id
   * Delete specific watch history entry
   */
  async deleteWatchHistoryEntry(
    request: FastifyRequest<{ Params: VideoIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      await this.videoService.deleteWatchHistoryEntry(userId, request.params.id);

      reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete watch history entry';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * DELETE /api/watch-history
   * Clear all watch history
   */
  async clearWatchHistory(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: 'Authorization header required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const result = await this.videoService.clearWatchHistory(userId);

      reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear watch history';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }
}
