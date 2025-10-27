/**
 * Channel Controller
 *
 * Handles HTTP requests for channel/creator profile features.
 */

import { injectable, inject } from 'inversify';
import { FastifyRequest, FastifyReply } from 'fastify';
import { TYPES } from '@/shared/types';
import { ChannelService } from '@/application/services/channel-service';
import { verifyAccessToken } from '@/modules/auth/domain/jwt-service';

interface ChannelIdParams {
  id: string;
}

interface UpdateChannelBody {
  name?: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  links?: Array<{ platform: string; url: string }>;
}

@injectable()
export class ChannelController {
  constructor(
    @inject(TYPES.ChannelService) private channelService: ChannelService
  ) {}

  /**
   * GET /api/channels/:id
   * Get public channel by ID
   */
  async getChannelById(
    request: FastifyRequest<{ Params: ChannelIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;

      const channel = await this.channelService.getChannelById(id);

      reply.send({
        success: true,
        data: { channel },
      });
    } catch (error: any) {
      const message = error.message || 'Failed to get channel';
      const statusCode = message.includes('not found') ? 404 : 500;

      reply.status(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/channels/my-channel
   * Get authenticated user's channel
   */
  async getMyChannel(
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

      const channel = await this.channelService.getMyChannel(userId);

      reply.send({
        success: true,
        data: { channel },
      });
    } catch (error: any) {
      const message = error.message || 'Failed to get channel';
      const statusCode =
        message.includes('not found') ? 404 :
        message.includes('must be a creator') ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PATCH /api/channels/my-channel
   * Update authenticated user's channel
   */
  async updateMyChannel(
    request: FastifyRequest<{ Body: UpdateChannelBody }>,
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

      const channel = await this.channelService.updateChannel(userId, request.body);

      reply.send({
        success: true,
        data: {
          channel,
          message: 'Channel updated successfully',
        },
      });
    } catch (error: any) {
      const message = error.message || 'Failed to update channel';
      const statusCode =
        message.includes('not found') ? 404 :
        message.includes('cannot be empty') || message.includes('must be less than') ? 400 : 500;

      reply.status(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/creators/apply
   * Apply to become a creator
   */
  async applyForCreator(
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

      const result = await this.channelService.applyForCreator(userId);

      reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      const message = error.message || 'Failed to apply for creator';
      const statusCode =
        message.includes('not found') ? 404 :
        message.includes('already a creator') ? 409 : 500;

      reply.status(statusCode).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/channels/user/:userId
   * Get channel by user ID
   */
  async getChannelByUserId(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId } = request.params;

      const channel = await this.channelService.getChannelByUserId(userId);

      reply.send({
        success: true,
        data: { channel },
      });
    } catch (error: any) {
      const message = error.message || 'Failed to get channel';
      const statusCode = message.includes('not found') ? 404 : 500;

      reply.status(statusCode).send({
        success: false,
        error: message,
      });
    }
  }
}
