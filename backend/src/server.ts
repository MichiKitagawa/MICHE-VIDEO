/**
 * Server Entry Point
 *
 * Initializes and starts the Fastify server.
 */

import 'reflect-metadata';
import { createContainer } from './container';
import { createApp } from './app';
import { initS3Client } from './shared/infrastructure/s3-client';
import { initMediaConvertClient } from './shared/infrastructure/mediaconvert-client';
import { initStripeClient } from './shared/infrastructure/stripe-client';
import { initRedisClient, closeRedisClient } from './shared/infrastructure/redis-client';
import logger from './shared/infrastructure/logger';

const PORT = parseInt(process.env.PORT || '4000');
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    logger.info('Starting Video Platform API Server', {
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV || 'development',
    });

    // Initialize AWS clients (optional in development)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      logger.info('Initializing AWS clients...');
      initS3Client();
      initMediaConvertClient();
      logger.info('AWS clients initialized successfully');
    } else {
      logger.warn('AWS credentials not configured, skipping AWS client initialization');
    }

    // Initialize Stripe client (optional in development)
    if (process.env.STRIPE_SECRET_KEY) {
      logger.info('Initializing Stripe client...');
      initStripeClient();
      logger.info('Stripe client initialized successfully');
    } else {
      logger.warn('Stripe secret key not configured, skipping Stripe client initialization');
    }

    // Initialize Redis client
    logger.info('Initializing Redis client...');
    await initRedisClient();
    logger.info('Redis client initialized successfully');

    // Create DI container
    logger.info('Creating dependency injection container...');
    const container = createContainer();
    logger.info('DI container created successfully');

    // Create Fastify app
    logger.info('Creating Fastify application...');
    const fastify = await createApp(container);

    // Start server
    await fastify.listen({ port: PORT, host: HOST });

    logger.info('Server started successfully', {
      url: `http://${HOST}:${PORT}`,
      healthCheck: `http://${HOST}:${PORT}/health`,
      metrics: `http://${HOST}:${PORT}/metrics`,
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  try {
    await closeRedisClient();
    logger.info('Redis client closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  try {
    await closeRedisClient();
    logger.info('Redis client closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
});

// Start the server
start();
