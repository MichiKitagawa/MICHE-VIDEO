/**
 * Social Controller
 *
 * Handles HTTP requests for social features (follow, notifications).
 */

import { injectable, inject } from 'inversify';
import { FastifyRequest, FastifyReply } from 'fastify';
import { TYPES } from '@/shared/types';
import { SocialService } from '@/application/services/social-service';
import { verifyAccessToken } from '@/modules/auth/domain/jwt-service';

interface UserIdParams {
  userId: string;
}

interface NotificationIdParams {
  id: string;
}

interface PaginationQuery {
  limit?: number;
  offset?: number;
}

@injectable()
export class SocialController {
  constructor(
    @inject(TYPES.SocialService) private socialService: SocialService
  ) {}

  /**
   * POST /api/users/:userId/follow
   * Follow a user
   */
  async followUser(
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          success: false,
          error: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const followerId = decoded.sub;

      const { userId: followingId } = request.params;

      const follow = await this.socialService.followUser(followerId, followingId);

      reply.send({
        success: true,
        data: {
          follow,
          message: 'Successfully followed user',
        },
      });
    } catch (error: any) {
      const message = error.message || 'Failed to follow user';
      const statusCode =
        message.includes('Cannot follow yourself') ? 400 :
        message.includes('Already following') ? 409 : 500;

      reply.status(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * DELETE /api/users/:userId/follow
   * Unfollow a user
   */
  async unfollowUser(
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          success: false,
          error: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const followerId = decoded.sub;

      const { userId: followingId } = request.params;

      await this.socialService.unfollowUser(followerId, followingId);

      reply.send({
        success: true,
        data: {
          message: 'Successfully unfollowed user',
        },
      });
    } catch (error: any) {
      const message = error.message || 'Failed to unfollow user';
      const statusCode = message.includes('Not following') ? 404 : 500;

      reply.status(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/users/:userId/followers
   * Get followers of a user
   */
  async getFollowers(
    request: FastifyRequest<{ Params: UserIdParams; Querystring: PaginationQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId } = request.params;
      const { limit = 20, offset = 0 } = request.query;

      const followers = await this.socialService.getFollowers(
        userId,
        Number(limit),
        Number(offset)
      );

      reply.send({
        success: true,
        data: { followers },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get followers',
      });
    }
  }

  /**
   * GET /api/users/:userId/following
   * Get users that a user is following
   */
  async getFollowing(
    request: FastifyRequest<{ Params: UserIdParams; Querystring: PaginationQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId } = request.params;
      const { limit = 20, offset = 0 } = request.query;

      const following = await this.socialService.getFollowing(
        userId,
        Number(limit),
        Number(offset)
      );

      reply.send({
        success: true,
        data: { following },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get following',
      });
    }
  }

  /**
   * GET /api/users/:userId/stats
   * Get user statistics
   */
  async getUserStats(
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId } = request.params;

      const stats = await this.socialService.getUserStats(userId);
      const followerCount = await this.socialService.getFollowerCount(userId);
      const followingCount = await this.socialService.getFollowingCount(userId);

      reply.send({
        success: true,
        data: {
          stats: stats || {
            followerCount,
            followingCount,
            totalViews: 0,
            totalLikes: 0,
            totalVideos: 0,
            totalShorts: 0,
          },
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get user stats',
      });
    }
  }

  /**
   * GET /api/notifications
   * Get user's notifications
   */
  async getNotifications(
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          success: false,
          error: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const { limit = 20, offset = 0 } = request.query;

      const notifications = await this.socialService.getNotifications(
        userId,
        Number(limit),
        Number(offset)
      );

      const unreadCount = await this.socialService.getUnreadNotificationCount(userId);

      reply.send({
        success: true,
        data: {
          notifications,
          unreadCount,
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get notifications',
      });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark notification as read
   */
  async markNotificationAsRead(
    request: FastifyRequest<{ Params: NotificationIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          success: false,
          error: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const { id } = request.params;

      const notification = await this.socialService.markNotificationAsRead(id, userId);

      reply.send({
        success: true,
        data: { notification },
      });
    } catch (error: any) {
      const message = error.message || 'Failed to mark notification as read';
      const statusCode =
        message.includes('not found') ? 404 :
        message.includes('Unauthorized') ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          success: false,
          error: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const count = await this.socialService.markAllNotificationsAsRead(userId);

      reply.send({
        success: true,
        data: {
          message: `Marked ${count} notifications as read`,
          count,
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to mark all notifications as read',
      });
    }
  }

  /**
   * GET /api/users/:userId/follow-status
   * Check if current user is following another user
   */
  async getFollowStatus(
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          success: false,
          error: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const followerId = decoded.sub;

      const { userId: followingId } = request.params;

      const isFollowing = await this.socialService.isFollowing(followerId, followingId);

      reply.send({
        success: true,
        data: { isFollowing },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get follow status',
      });
    }
  }
}
