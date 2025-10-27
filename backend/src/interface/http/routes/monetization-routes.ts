/**
 * Monetization Routes
 *
 * Defines HTTP routes for monetization features.
 */

import { FastifyInstance } from 'fastify';
import { Container } from 'inversify';
import { TYPES } from '@/shared/types';
import { MonetizationController } from '@/interface/http/controllers/monetization-controller';

export async function monetizationRoutes(fastify: FastifyInstance, container: Container): Promise<void> {
  const controller = container.get<MonetizationController>(TYPES.MonetizationController);

  // Tip routes (authenticated)
  fastify.post('/api/tips/send', async (request: any, reply: any) => {
    return controller.sendTip(request, reply);
  });

  fastify.get('/api/tips/sent', async (request: any, reply: any) => {
    return controller.getSentTips(request, reply);
  });

  fastify.get('/api/tips/received', async (request: any, reply: any) => {
    return controller.getReceivedTips(request, reply);
  });

  // Earnings routes (authenticated, creator only)
  fastify.get('/api/earnings/stats', async (request: any, reply: any) => {
    return controller.getEarningsStats(request, reply);
  });

  fastify.get('/api/earnings/history', async (request: any, reply: any) => {
    return controller.getEarningsHistory(request, reply);
  });

  // Content tips (public)
  fastify.get('/api/content/:contentType/:contentId/tips', async (request: any, reply: any) => {
    return controller.getContentTips(request, reply);
  });
}
