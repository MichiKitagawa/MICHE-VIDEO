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
import { channelRoutes } from '@/interface/http/routes/channel-routes';
import logger from '@/shared/infrastructure/logger';
import {
  performanceMonitoringHook,
  getPerformanceMetrics,
  getMemoryUsage,
  startPerformanceReporting,
  startMemoryMonitoring,
} from '@/shared/infrastructure/performance-monitor';
import {
  errorHandler,
  setupUncaughtExceptionHandler,
} from '@/shared/infrastructure/error-handler';
import {
  corsConfig,
  helmetConfig,
  rateLimitConfig,
} from '@/shared/middleware/security-config';

export async function createApp(container: Container): Promise<FastifyInstance> {
  // Setup uncaught exception handlers
  setupUncaughtExceptionHandler();

  const fastify = Fastify({
    logger: false, // Disable built-in logger, use Winston instead
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => {
      // Generate unique request ID
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
  });

  // Register CORS with production-ready configuration
  await fastify.register(cors, corsConfig);

  // Register Helmet for security headers
  await fastify.register(helmet, helmetConfig);

  // Register Rate Limiting with enhanced configuration
  await fastify.register(rateLimit, rateLimitConfig);

  // Add performance monitoring hook to all requests
  fastify.addHook('onRequest', performanceMonitoringHook);

  // Set global error handler
  fastify.setErrorHandler(errorHandler);

  // Log server startup
  logger.info('Fastify application starting', {
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  });

  // Health check
  fastify.get('/health', async () => {
    const memory = getMemoryUsage();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory,
    };
  });

  // Performance metrics endpoint
  fastify.get('/metrics', async () => {
    const metrics = getPerformanceMetrics();
    const memory = getMemoryUsage();

    return {
      success: true,
      data: {
        ...metrics,
        memory,
        timestamp: new Date().toISOString(),
      },
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
  await channelRoutes(fastify, container);

  // Start periodic performance and memory reporting
  if (process.env.NODE_ENV === 'production') {
    startPerformanceReporting(60); // Every 60 minutes
    startMemoryMonitoring(30); // Every 30 minutes
    logger.info('Performance and memory monitoring started');
  }

  logger.info('Fastify application configured successfully');

  return fastify;
}
