/**
 * Playlist Controller
 *
 * Handles HTTP endpoints for playlist management.
 */

import { injectable, inject } from 'inversify';
import { FastifyRequest, FastifyReply } from 'fastify';
import { TYPES } from '@/shared/types';
import { PlaylistService } from '@/application/services/playlist-service';
import { verifyAccessToken } from '@/modules/auth/domain/jwt-service';

interface CreatePlaylistRequest {
  name: string;
  description?: string;
  is_public: boolean;
}

interface UpdatePlaylistRequest {
  name?: string;
  description?: string;
  is_public?: boolean;
}

interface AddVideoRequest {
  video_id: string;
}

interface ReorderVideosRequest {
  video_orders: Array<{ video_id: string; position: number }>;
}

@injectable()
export class PlaylistController {
  constructor(
    @inject(TYPES.PlaylistService)
    private playlistService: PlaylistService
  ) {}

  /**
   * POST /api/playlists/create
   * Create a new playlist
   */
  async createPlaylist(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const body = request.body as CreatePlaylistRequest;

      // Validate request
      if (!body.name) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'name is required',
        });
        return;
      }

      const playlist = await this.playlistService.createPlaylist({
        userId,
        name: body.name,
        description: body.description,
        isPublic: body.is_public ?? true,
      });

      reply.status(201).send({ playlist });
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('must be')) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }

      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/playlists/my-playlists
   * Get user's playlists
   */
  async getMyPlaylists(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const query = request.query as any;
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '20');
      const offset = (page - 1) * limit;

      const playlists = await this.playlistService.getUserPlaylists(userId, limit, offset);

      reply.send({
        playlists,
        pagination: {
          page,
          limit,
          total: playlists.length,
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/playlists/:id
   * Get playlist by ID
   */
  async getPlaylist(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      // Extract userId if authenticated (optional)
      const authHeader = request.headers.authorization;
      let userId: string | undefined;
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const decoded = verifyAccessToken(token);
          userId = decoded.sub;
        } catch {
          // Ignore auth errors for public playlists
        }
      }

      const playlist = await this.playlistService.getPlaylistById(id, userId);

      reply.send(playlist);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        reply.status(404).send({
          error: 'NOT_FOUND',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('permission')) {
        reply.status(403).send({
          error: 'FORBIDDEN',
          message: error.message,
        });
        return;
      }

      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/playlists/:id
   * Update playlist
   */
  async updatePlaylist(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const { id } = request.params as { id: string };
      const body = request.body as UpdatePlaylistRequest;

      const playlist = await this.playlistService.updatePlaylist(id, userId, {
        name: body.name,
        description: body.description,
        isPublic: body.is_public,
      });

      reply.send({ playlist });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        reply.status(404).send({
          error: 'NOT_FOUND',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('permission')) {
        reply.status(403).send({
          error: 'FORBIDDEN',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('required') || error.message.includes('must be')) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }

      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/playlists/:id
   * Delete playlist
   */
  async deletePlaylist(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const { id } = request.params as { id: string };

      await this.playlistService.deletePlaylist(id, userId);

      reply.send({ message: 'Playlist deleted successfully' });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        reply.status(404).send({
          error: 'NOT_FOUND',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('permission')) {
        reply.status(403).send({
          error: 'FORBIDDEN',
          message: error.message,
        });
        return;
      }

      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/playlists/:id/videos/add
   * Add video to playlist
   */
  async addVideo(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const { id } = request.params as { id: string };
      const body = request.body as AddVideoRequest;

      if (!body.video_id) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'video_id is required',
        });
        return;
      }

      const result = await this.playlistService.addVideoToPlaylist({
        userId,
        playlistId: id,
        videoId: body.video_id,
      });

      reply.send(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        reply.status(404).send({
          error: 'NOT_FOUND',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('permission')) {
        reply.status(403).send({
          error: 'FORBIDDEN',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('already in')) {
        reply.status(409).send({
          error: 'CONFLICT',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('cannot contain more than')) {
        reply.status(413).send({
          error: 'PAYLOAD_TOO_LARGE',
          message: error.message,
        });
        return;
      }

      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/playlists/:id/videos/:videoId
   * Remove video from playlist
   */
  async removeVideo(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const { id, videoId } = request.params as { id: string; videoId: string };

      await this.playlistService.removeVideoFromPlaylist({
        userId,
        playlistId: id,
        videoId,
      });

      reply.send({ message: 'Video removed from playlist' });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        reply.status(404).send({
          error: 'NOT_FOUND',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('permission')) {
        reply.status(403).send({
          error: 'FORBIDDEN',
          message: error.message,
        });
        return;
      }

      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/playlists/:id/videos/reorder
   * Reorder videos in playlist
   */
  async reorderVideos(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract userId from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authorization header required',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyAccessToken(token);
      const userId = decoded.sub;

      const { id } = request.params as { id: string };
      const body = request.body as ReorderVideosRequest;

      if (!body.video_orders || !Array.isArray(body.video_orders)) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'video_orders is required and must be an array',
        });
        return;
      }

      await this.playlistService.reorderVideos({
        userId,
        playlistId: id,
        videoOrders: body.video_orders.map((order) => ({
          videoId: order.video_id,
          position: order.position,
        })),
      });

      reply.send({ message: 'Videos reordered successfully' });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        reply.status(404).send({
          error: 'NOT_FOUND',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('permission')) {
        reply.status(403).send({
          error: 'FORBIDDEN',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('required')) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }

      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
}
