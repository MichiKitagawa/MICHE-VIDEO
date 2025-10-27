/**
 * Subscription Routes
 *
 * Defines HTTP routes for subscription management.
 */

import { FastifyInstance } from 'fastify';
import { Container } from 'inversify';
import { TYPES } from '@/shared/types';
import { SubscriptionController } from '@/interface/http/controllers/subscription-controller';

export async function subscriptionRoutes(fastify: FastifyInstance, container: Container): Promise<void> {
  const controller = container.get<SubscriptionController>(TYPES.SubscriptionController);

  // Public routes
  fastify.get('/api/subscriptions/plans', async (request: any, reply: any) => {
    return controller.getPlans(request, reply);
  });

  // Protected routes (require authentication)
  fastify.get('/api/subscriptions/current', async (request: any, reply: any) => {
    return controller.getCurrentSubscription(request, reply);
  });

  fastify.post('/api/subscriptions/create-checkout', async (request: any, reply: any) => {
    return controller.createCheckoutSession(request, reply);
  });

  // Alias for frontend compatibility
  fastify.post('/api/payment/stripe/checkout', async (request: any, reply: any) => {
    return controller.createCheckoutSession(request, reply);
  });

  fastify.post('/api/subscriptions/cancel', async (request: any, reply: any) => {
    return controller.cancelSubscription(request, reply);
  });

  fastify.get('/api/subscriptions/payment-history', async (request: any, reply: any) => {
    return controller.getPaymentHistory(request, reply);
  });

  // Webhook routes (no authentication, verified by signature)
  fastify.post('/api/webhooks/stripe', async (request: any, reply: any) => {
    return controller.handleStripeWebhook(request, reply);
  });
}
