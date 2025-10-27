/**
 * Redis Client Configuration
 *
 * Provides Redis connection for caching and session management.
 */

import { createClient } from 'redis';

type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client with configuration from environment.
 */
export async function initRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
  });

  await client.connect();

  redisClient = client;
  return redisClient;
}

/**
 * Get the existing Redis client instance.
 * @throws Error if client is not initialized
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedisClient() first.');
  }
  return redisClient;
}

/**
 * Close Redis connection gracefully.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
