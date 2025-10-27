/**
 * Channel Routes
 *
 * Defines channel/creator profile endpoints.
 */

import { FastifyInstance } from 'fastify';
import { Container } from 'inversify';
import { TYPES } from '@/shared/types';
import { ChannelController } from '../controllers/channel-controller';

export async function channelRoutes(fastify: FastifyInstance, container: Container): Promise<void> {
  const controller = container.get<ChannelController>(TYPES.ChannelController);

  // Creator application
  fastify.post('/api/creators/apply', async (request: any, reply: any) => {
    return controller.applyForCreator(request, reply);
  });

  // My Channel
  fastify.get('/api/channels/my-channel', async (request: any, reply: any) => {
    return controller.getMyChannel(request, reply);
  });

  fastify.patch('/api/channels/my-channel', async (request: any, reply: any) => {
    return controller.updateMyChannel(request, reply);
  });

  // Public Channels
  fastify.get('/api/channels/:id', async (request: any, reply: any) => {
    return controller.getChannelById(request, reply);
  });

  fastify.get('/api/channels/user/:userId', async (request: any, reply: any) => {
    return controller.getChannelByUserId(request, reply);
  });
}
