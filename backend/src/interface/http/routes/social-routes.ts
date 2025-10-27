/**
 * Social Routes
 *
 * Defines social feature endpoints (follow, notifications).
 */

import { FastifyInstance } from 'fastify';
import { Container } from 'inversify';
import { TYPES } from '@/shared/types';
import { SocialController } from '../controllers/social-controller';

export async function socialRoutes(fastify: FastifyInstance, container: Container): Promise<void> {
  const controller = container.get<SocialController>(TYPES.SocialController);

  // Follow/Unfollow
  fastify.post('/api/users/:userId/follow', async (request: any, reply: any) => {
    return controller.followUser(request, reply);
  });

  fastify.delete('/api/users/:userId/follow', async (request: any, reply: any) => {
    return controller.unfollowUser(request, reply);
  });

  // Get Followers/Following
  fastify.get('/api/users/:userId/followers', async (request: any, reply: any) => {
    return controller.getFollowers(request, reply);
  });

  fastify.get('/api/users/:userId/following', async (request: any, reply: any) => {
    return controller.getFollowing(request, reply);
  });

  // User Stats
  fastify.get('/api/users/:userId/stats', async (request: any, reply: any) => {
    return controller.getUserStats(request, reply);
  });

  // Follow Status
  fastify.get('/api/users/:userId/follow-status', async (request: any, reply: any) => {
    return controller.getFollowStatus(request, reply);
  });

  // Notifications
  fastify.get('/api/notifications', async (request: any, reply: any) => {
    return controller.getNotifications(request, reply);
  });

  fastify.patch('/api/notifications/:id/read', async (request: any, reply: any) => {
    return controller.markNotificationAsRead(request, reply);
  });

  fastify.patch('/api/notifications/read-all', async (request: any, reply: any) => {
    return controller.markAllNotificationsAsRead(request, reply);
  });
}
