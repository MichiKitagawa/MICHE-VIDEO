/**
 * Cache Service
 *
 * Provides high-level caching operations with strategic TTL configuration.
 * Implements cache key patterns and invalidation strategies.
 */

import { injectable } from 'inversify';
import { getRedisClient } from './redis-client';

/**
 * Cache TTL Configuration (in seconds)
 */
export const CacheTTL = {
  // Hot Data (5-10 minutes) - Frequently accessed
  SESSION: 300, // 5 minutes
  UNREAD_COUNT: 60, // 1 minute
  POPULAR_VIDEOS: 600, // 10 minutes
  TRENDING_CHANNELS: 600, // 10 minutes

  // Warm Data (30-60 minutes) - Moderately accessed
  USER_PROFILE: 1800, // 30 minutes
  VIDEO_DETAILS: 3600, // 60 minutes
  CHANNEL_PROFILE: 1800, // 30 minutes
  PLAYLIST_DETAILS: 1800, // 30 minutes
  USER_STATS: 1800, // 30 minutes

  // Cold Data (2-4 hours) - Rarely changing
  SUBSCRIPTION_PLANS: 7200, // 2 hours
  VIDEO_CATEGORIES: 14400, // 4 hours
  PLATFORM_STATS: 7200, // 2 hours
} as const;

/**
 * Cache Key Generators
 */
export const CacheKeys = {
  // User keys
  userProfile: (userId: string) => `user:${userId}:profile`,
  userStats: (userId: string) => `user:${userId}:stats`,
  unreadNotificationCount: (userId: string) => `user:${userId}:unread-count`,
  userFollowerCount: (userId: string) => `user:${userId}:followers:count`,
  userFollowingCount: (userId: string) => `user:${userId}:following:count`,

  // Video keys
  videoDetails: (videoId: string) => `video:${videoId}:details`,
  popularVideos: (categoryId?: string) => categoryId ? `video:popular:${categoryId}` : 'video:popular:all',
  videoCommentCount: (videoId: string) => `video:${videoId}:comment-count`,
  videoViewCount: (videoId: string) => `video:${videoId}:view-count`,
  videoLikeCount: (videoId: string) => `video:${videoId}:like-count`,

  // Channel keys
  channelProfile: (channelId: string) => `channel:${channelId}:profile`,
  trendingChannels: () => 'channel:trending',
  channelSubscriberCount: (channelId: string) => `channel:${channelId}:subscriber-count`,

  // Playlist keys
  playlistDetails: (playlistId: string) => `playlist:${playlistId}:details`,
  playlistVideos: (playlistId: string) => `playlist:${playlistId}:videos`,

  // Subscription keys
  subscriptionPlans: () => 'subscription:plans:active',
  userSubscription: (userId: string) => `subscription:user:${userId}:active`,

  // Category keys
  videoCategories: () => 'video:categories:active',

  // Social keys
  isFollowing: (followerId: string, followingId: string) => `social:follow:${followerId}:${followingId}`,
} as const;

/**
 * Cache Service
 */
@injectable()
export class CacheService {
  private redis: any;

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[CacheService] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setEx(key, ttl, serialized);
    } catch (error) {
      console.error(`[CacheService] Error setting key ${key}:`, error);
    }
  }

  /**
   * Delete single key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`[CacheService] Error deleting key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (error) {
      console.error(`[CacheService] Error deleting pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[CacheService] Error checking key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`[CacheService] Error getting TTL for ${key}:`, error);
      return -2; // Key doesn't exist
    }
  }

  /**
   * Increment numeric value in cache
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.incrBy(key, by);
    } catch (error) {
      console.error(`[CacheService] Error incrementing ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement numeric value in cache
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.decrBy(key, by);
    } catch (error) {
      console.error(`[CacheService] Error decrementing ${key}:`, error);
      return 0;
    }
  }

  /**
   * Cache aside pattern: Get from cache, or fetch and cache
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const fresh = await fetchFn();

    // Cache the result
    await this.set(key, fresh, ttl);

    return fresh;
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.deleteByPattern(`user:${userId}:*`);
  }

  /**
   * Invalidate video-related cache
   */
  async invalidateVideoCache(videoId: string): Promise<void> {
    await this.deleteByPattern(`video:${videoId}:*`);
    // Also invalidate popular lists that might contain this video
    await this.deleteByPattern('video:popular:*');
  }

  /**
   * Invalidate channel-related cache
   */
  async invalidateChannelCache(channelId: string): Promise<void> {
    await this.deleteByPattern(`channel:${channelId}:*`);
    await this.delete(CacheKeys.trendingChannels());
  }

  /**
   * Invalidate playlist-related cache
   */
  async invalidatePlaylistCache(playlistId: string): Promise<void> {
    await this.deleteByPattern(`playlist:${playlistId}:*`);
  }

  /**
   * Flush entire cache (use with caution!)
   */
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushDb();
      console.log('[CacheService] Cache flushed');
    } catch (error) {
      console.error('[CacheService] Error flushing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info('stats');
      const keys = await this.redis.dbSize();

      // Parse hit rate from info string
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);

      let hitRate: number | undefined;
      if (hitsMatch && missesMatch) {
        const hits = parseInt(hitsMatch[1]);
        const misses = parseInt(missesMatch[1]);
        const total = hits + misses;
        hitRate = total > 0 ? (hits / total) * 100 : undefined;
      }

      return {
        keys,
        memory: 'N/A', // Would need redis.info('memory') for detailed memory stats
        hitRate,
      };
    } catch (error) {
      console.error('[CacheService] Error getting stats:', error);
      return { keys: 0, memory: 'N/A' };
    }
  }
}
