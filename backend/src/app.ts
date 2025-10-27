/**
 * Fastify Application Setup
 *
 * Configures Fastify instance with middleware and routes.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Container } from 'inversify';
import { TYPES } from '@/shared/types';
import { AuthController } from '@/interface/http/controllers/auth-controller';
import { VideoController } from '@/interface/http/controllers/video-controller';
import { registerAuthRoutes } from '@/interface/http/routes/auth-routes';
import { registerVideoRoutes } from '@/interface/http/routes/video-routes';
import { subscriptionRoutes } from '@/interface/http/routes/subscription-routes';
import { monetizationRoutes } from '@/interface/http/routes/monetization-routes';
import { playlistRoutes } from '@/interface/http/routes/playlist-routes';
import { socialRoutes } from '@/interface/http/routes/social-routes';

export async function createApp(container: Container): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Register Helmet for security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  // Register Rate Limiting
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  });

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // Register routes
  const authController = container.get<AuthController>(TYPES.AuthController);
  await registerAuthRoutes(fastify, authController);

  const videoController = container.get<VideoController>(TYPES.VideoController);
  await registerVideoRoutes(fastify, videoController);

  await subscriptionRoutes(fastify, container);
  await monetizationRoutes(fastify, container);
  await playlistRoutes(fastify, container);
  await socialRoutes(fastify, container);

  return fastify;
}
