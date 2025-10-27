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

const PORT = parseInt(process.env.PORT || '4000');
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Initialize AWS clients
    console.log('Initializing AWS clients...');
    initS3Client();
    initMediaConvertClient();

    // Create DI container
    const container = createContainer();

    // Create Fastify app
    const fastify = await createApp(container);

    // Start server
    await fastify.listen({ port: PORT, host: HOST });

    console.log(`Server listening on http://${HOST}:${PORT}`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start the server
start();
