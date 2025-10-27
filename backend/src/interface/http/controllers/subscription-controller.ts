/**
 * Subscription Controller
 *
 * Handles HTTP endpoints for subscription management and payment processing.
 */

import { injectable, inject } from 'inversify';
import { FastifyRequest, FastifyReply } from 'fastify';
import { TYPES } from '@/shared/types';
import { SubscriptionService } from '@/application/services/subscription-service';
import { verifyAccessToken } from '@/modules/auth/domain/jwt-service';
import * as stripeClient from '@/shared/infrastructure/stripe-client';

interface CreateCheckoutRequest {
  plan_id: string;
}

interface CancelSubscriptionRequest {
  immediately?: boolean;
}

@injectable()
export class SubscriptionController {
  constructor(
    @inject(TYPES.SubscriptionService)
    private subscriptionService: SubscriptionService
  ) {}

  /**
   * GET /api/subscriptions/plans
   * Get all active subscription plans
   */
  async getPlans(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const plans = await this.subscriptionService.getPlans();
      reply.send(plans);
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/subscriptions/current
   * Get current active subscription for authenticated user
   */
  async getCurrentSubscription(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const subscription = await this.subscriptionService.getCurrentSubscription(userId);

      if (!subscription) {
        reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'No active subscription found',
        });
        return;
      }

      reply.send(subscription);
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/subscriptions/create-checkout
   * Create Stripe checkout session for subscription
   */
  async createCheckoutSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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
      const userEmail = decoded.email || '';

      if (!userEmail) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'User email not found in token',
        });
        return;
      }

      const body = request.body as CreateCheckoutRequest;
      if (!body.plan_id) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'plan_id is required',
        });
        return;
      }

      const result = await this.subscriptionService.createCheckoutSession({
        userId,
        userEmail,
        planId: body.plan_id,
      });

      reply.send({
        checkout_url: result.checkoutUrl,
        session_id: result.sessionId,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('not active')) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('already has')) {
        reply.status(409).send({
          error: 'CONFLICT',
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
   * POST /api/subscriptions/cancel
   * Cancel current subscription
   */
  async cancelSubscription(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const body = request.body as CancelSubscriptionRequest;
      const subscription = await this.subscriptionService.cancelSubscription({
        userId,
        immediately: body.immediately || false,
      });

      reply.send({
        message: 'サブスクリプションをキャンセルしました',
        subscription,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        reply.status(404).send({
          error: 'NOT_FOUND',
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
   * GET /api/subscriptions/payment-history
   * Get payment history for authenticated user
   */
  async getPaymentHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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
      const history = await this.subscriptionService.getPaymentHistory(userId, limit);

      reply.send(history);
    } catch (error: any) {
      reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/webhooks/stripe
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const signature = request.headers['stripe-signature'] as string;
      if (!signature) {
        reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'Missing stripe-signature header',
        });
        return;
      }

      // Construct event from webhook payload
      const payload = (request.body as any).toString();
      const event = stripeClient.constructWebhookEvent(payload, signature);

      // Process webhook event
      await this.subscriptionService.handleStripeWebhook(event);

      reply.send({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error);
      reply.status(400).send({
        error: 'WEBHOOK_ERROR',
        message: error.message,
      });
    }
  }
}
