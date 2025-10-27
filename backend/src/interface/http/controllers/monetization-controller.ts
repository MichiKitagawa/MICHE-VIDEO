/**
 * Monetization Controller
 *
 * Handles HTTP endpoints for tips, earnings, and withdrawals.
 */

import { injectable, inject } from 'inversify';
import { FastifyRequest, FastifyReply } from 'fastify';
import { TYPES } from '@/shared/types';
import { MonetizationService } from '@/application/services/monetization-service';
import { verifyAccessToken } from '@/modules/auth/domain/jwt-service';

interface SendTipRequest {
  content_id: string;
  content_type: 'video' | 'short' | 'live';
  amount: number;
  message?: string;
}

@injectable()
export class MonetizationController {
  constructor(
    @inject(TYPES.MonetizationService)
    private monetizationService: MonetizationService
  ) {}

  /**
   * POST /api/tips/send
   * Send a tip to content creator
   */
  async sendTip(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const body = request.body as SendTipRequest;

      // Validate request
      if (!body.content_id || !body.content_type || !body.amount) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'content_id, content_type, and amount are required',
        });
        return;
      }

      const result = await this.monetizationService.sendTip({
        fromUserId: userId,
        contentType: body.content_type,
        contentId: body.content_id,
        amount: body.amount,
        message: body.message,
      });

      reply.status(201).send({
        tip: result.tip,
        payment: result.payment,
      });
    } catch (error: any) {
      if (error.message.includes('Minimum tip')) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('not found') || error.message.includes('not yet supported')) {
        reply.status(404).send({
          error: 'NOT_FOUND',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('cannot tip yourself')) {
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
   * GET /api/tips/sent
   * Get tips sent by authenticated user
   */
  async getSentTips(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const limit = parseInt((request.query as any).limit || '20');
      const tips = await this.monetizationService.getSentTips(userId, limit);

      reply.send(tips);
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tips/received
   * Get tips received by authenticated user
   */
  async getReceivedTips(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const limit = parseInt((request.query as any).limit || '20');
      const tips = await this.monetizationService.getReceivedTips(userId, limit);

      reply.send(tips);
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/earnings/stats
   * Get earnings statistics for creator
   */
  async getEarningsStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const stats = await this.monetizationService.getEarningsStats(userId);

      reply.send(stats);
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/earnings/history
   * Get earnings history for creator
   */
  async getEarningsHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const limit = parseInt((request.query as any).limit || '20');
      const history = await this.monetizationService.getEarningsHistory(userId, limit);

      reply.send(history);
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/content/:contentType/:contentId/tips
   * Get tips for specific content
   */
  async getContentTips(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { contentType, contentId } = request.params as { contentType: string; contentId: string };

      const tips = await this.monetizationService.getContentTips(contentType, contentId);

      reply.send(tips);
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
}
