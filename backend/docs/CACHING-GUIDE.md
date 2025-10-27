# Redis Caching Strategy Guide

## Overview

This guide documents the Redis caching implementation for the Video Platform backend. The caching layer provides significant performance improvements for frequently accessed data.

## Architecture

### CacheService

Location: `src/shared/infrastructure/cache-service.ts`

The `CacheService` provides high-level caching operations with strategic TTL configuration:

- **get/set/delete**: Basic cache operations
- **getOrFetch**: Cache-aside pattern
- **invalidate methods**: Targeted cache invalidation
- **increment/decrement**: Atomic counter operations

### Cache Layers

#### L1: Hot Data (5-10 minutes TTL)
Frequently accessed, short-lived cache:
- User sessions
- Unread notification counts
- Popular videos list
- Trending channels

#### L2: Warm Data (30-60 minutes TTL)
Moderately accessed data:
- User profiles
- Video details
- Channel profiles
- Playlist details
- User statistics

#### L3: Cold Data (2-4 hours TTL)
Rarely changing data:
- Subscription plans
- Video categories
- Platform statistics

## Cache Key Patterns

All cache keys follow a consistent pattern:

```typescript
// User keys
user:{userId}:profile
user:{userId}:stats
user:{userId}:unread-count
user:{userId}:followers:count
user:{userId}:following:count

// Video keys
video:{videoId}:details
video:popular:all
video:popular:{categoryId}
video:{videoId}:comment-count
video:{videoId}:view-count
video:{videoId}:like-count

// Channel keys
channel:{channelId}:profile
channel:trending
channel:{channelId}:subscriber-count

// Playlist keys
playlist:{playlistId}:details
playlist:{playlistId}:videos

// Social keys
social:follow:{followerId}:{followingId}
```

## Integration Examples

### 1. VideoService - Cache Video Details

```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from '@/shared/types';
import { CacheService, CacheKeys, CacheTTL } from '@/shared/infrastructure/cache-service';
import { IVideoRepository } from '../infrastructure/interfaces';

@injectable()
export class VideoService {
  constructor(
    @inject(TYPES.VideoRepository) private videoRepo: IVideoRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}

  async getVideoById(id: string): Promise<Video | null> {
    // Cache-aside pattern: try cache first, then database
    return this.cache.getOrFetch(
      CacheKeys.videoDetails(id),
      async () => this.videoRepo.findById(id),
      CacheTTL.VIDEO_DETAILS
    );
  }

  async updateVideo(id: string, data: UpdateVideoDto): Promise<Video> {
    const video = await this.videoRepo.update(id, data);

    // Invalidate cache after update
    await this.cache.invalidateVideoCache(id);

    return video;
  }

  async getPopularVideos(categoryId?: string, limit: number = 20): Promise<Video[]> {
    const cacheKey = CacheKeys.popularVideos(categoryId);

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        return this.videoRepo.findMany({
          categoryId,
          privacy: 'public',
          status: 'ready',
          orderBy: 'viewCount',
          orderDirection: 'desc',
          limit,
        });
      },
      CacheTTL.POPULAR_VIDEOS
    );
  }
}
```

### 2. SocialService - Cache Notification Counts

```typescript
@injectable()
export class SocialService {
  constructor(
    @inject(TYPES.NotificationRepository) private notificationRepo: INotificationRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const cacheKey = CacheKeys.unreadNotificationCount(userId);

    return this.cache.getOrFetch(
      cacheKey,
      async () => this.notificationRepo.getUnreadCount(userId),
      CacheTTL.UNREAD_COUNT
    );
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.markAsRead(id);

    // Invalidate unread count cache
    await this.cache.delete(CacheKeys.unreadNotificationCount(userId));

    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const count = await this.notificationRepo.markAllAsRead(userId);

    // Invalidate unread count cache
    await this.cache.delete(CacheKeys.unreadNotificationCount(userId));

    return count;
  }
}
```

### 3. ChannelService - Cache Channel Profiles

```typescript
@injectable()
export class ChannelService {
  constructor(
    @inject(TYPES.ChannelRepository) private channelRepo: IChannelRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}

  async getChannelById(id: string): Promise<Channel | null> {
    return this.cache.getOrFetch(
      CacheKeys.channelProfile(id),
      async () => this.channelRepo.findById(id),
      CacheTTL.CHANNEL_PROFILE
    );
  }

  async updateChannel(id: string, data: UpdateChannelDto): Promise<Channel> {
    const channel = await this.channelRepo.update(id, data);

    // Invalidate channel cache and trending list
    await this.cache.invalidateChannelCache(id);

    return channel;
  }

  async getTrendingChannels(limit: number = 10): Promise<Channel[]> {
    return this.cache.getOrFetch(
      CacheKeys.trendingChannels(),
      async () => {
        // Query channels ordered by subscriber count
        return this.channelRepo.findMany({
          orderBy: 'subscriberCount',
          orderDirection: 'desc',
          limit,
        });
      },
      CacheTTL.TRENDING_CHANNELS
    );
  }
}
```

### 4. AuthService - Cache User Profiles

```typescript
@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: IUserRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}

  async getProfile(userId: string): Promise<User | null> {
    return this.cache.getOrFetch(
      CacheKeys.userProfile(userId),
      async () => this.userRepo.findById(userId),
      CacheTTL.USER_PROFILE
    );
  }

  async updateProfile(userId: string, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.update(userId, data);

    // Invalidate user cache
    await this.cache.invalidateUserCache(userId);

    return user;
  }
}
```

## Cache Invalidation Strategies

### 1. Write-Through (Recommended)

Update cache immediately after database write:

```typescript
async updateVideo(id: string, data: UpdateVideoDto): Promise<Video> {
  const video = await this.videoRepo.update(id, data);

  // Write-through: invalidate old cache immediately
  await this.cache.invalidateVideoCache(id);

  return video;
}
```

### 2. TTL-Based (Automatic)

Let cache expire naturally:

```typescript
// Cache automatically expires after TTL
await this.cache.set(key, value, CacheTTL.VIDEO_DETAILS);
```

### 3. Manual Invalidation (For Critical Updates)

Explicitly invalidate related caches:

```typescript
async deleteVideo(id: string): Promise<void> {
  await this.videoRepo.delete(id);

  // Invalidate all related caches
  await this.cache.invalidateVideoCache(id);
  await this.cache.deleteByPattern('video:popular:*');
  await this.cache.invalidateUserCache(video.userId); // User's video count
}
```

## Atomic Counter Operations

For frequently updated counters, use atomic operations:

```typescript
async incrementViewCount(videoId: string): Promise<void> {
  await this.videoRepo.incrementViewCount(videoId);

  // Increment cached count atomically
  const cacheKey = CacheKeys.videoViewCount(videoId);
  await this.cache.increment(cacheKey);

  // Set expiry if this is a new key
  const ttl = await this.cache.ttl(cacheKey);
  if (ttl === -1) {
    await this.redis.expire(cacheKey, CacheTTL.VIDEO_DETAILS);
  }
}
```

## Performance Monitoring

Get cache statistics:

```typescript
const stats = await cacheService.getStats();
console.log('Cache Statistics:', {
  keys: stats.keys,
  hitRate: stats.hitRate ? `${stats.hitRate.toFixed(2)}%` : 'N/A',
  memory: stats.memory,
});
```

## Best Practices

### DO ✅

1. **Use cache-aside pattern** for read-heavy operations
2. **Invalidate immediately** after writes
3. **Use consistent key patterns** (via CacheKeys)
4. **Set appropriate TTLs** based on data volatility
5. **Handle cache failures gracefully** (return null, fetch from DB)
6. **Monitor cache hit rates** regularly

### DON'T ❌

1. **Don't cache sensitive data** (passwords, tokens, personal info)
2. **Don't cache rapidly changing data** (real-time analytics)
3. **Don't rely solely on cache** (always have DB fallback)
4. **Don't use cache for data consistency** (use DB transactions)
5. **Don't set infinite TTLs** (always use reasonable expiry)
6. **Don't forget to invalidate** after updates

## Cache Warm-Up (Optional)

Pre-populate cache on server start for critical data:

```typescript
export async function warmUpCache(container: Container): Promise<void> {
  const cache = container.get<CacheService>(TYPES.CacheService);
  const subscriptionRepo = container.get<ISubscriptionPlanRepository>(TYPES.SubscriptionPlanRepository);

  console.log('[Cache] Warming up...');

  // Pre-cache subscription plans
  const plans = await subscriptionRepo.findActiveAdult Plans();
  await cache.set(CacheKeys.subscriptionPlans(), plans, CacheTTL.SUBSCRIPTION_PLANS);

  console.log('[Cache] Warm-up complete');
}

// In server.ts:
await warmUpCache(container);
```

## Testing Cache Integration

### Unit Test Example

```typescript
describe('VideoService with Cache', () => {
  let videoService: VideoService;
  let mockVideoRepo: jest.Mocked<IVideoRepository>;
  let mockCache: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockVideoRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    mockCache = {
      getOrFetch: jest.fn(),
      invalidateVideoCache: jest.fn(),
    } as any;

    videoService = new VideoService(mockVideoRepo, mockCache);
  });

  it('should use cache for getVideoById', async () => {
    const video = { id: '123', title: 'Test Video' };
    mockCache.getOrFetch.mockResolvedValue(video);

    const result = await videoService.getVideoById('123');

    expect(mockCache.getOrFetch).toHaveBeenCalledWith(
      'video:123:details',
      expect.any(Function),
      3600
    );
    expect(result).toEqual(video);
  });

  it('should invalidate cache on update', async () => {
    const updated = { id: '123', title: 'Updated' };
    mockVideoRepo.update.mockResolvedValue(updated);

    await videoService.updateVideo('123', { title: 'Updated' });

    expect(mockCache.invalidateVideoCache).toHaveBeenCalledWith('123');
  });
});
```

## Production Considerations

### Redis Configuration

```bash
# .env
REDIS_HOST=your-redis-host.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
```

### Memory Management

Monitor Redis memory usage:

```bash
# Check memory
redis-cli INFO memory

# Set max memory policy
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### High Availability

For production, use Redis Cluster or Sentinel:

```typescript
// redis-client.ts production config
const client = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    tls: process.env.NODE_ENV === 'production',
  },
  password: process.env.REDIS_PASSWORD,
  // Retry strategy
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Max retries reached');
      return Math.min(retries * 50, 1000);
    },
  },
});
```

## Performance Impact

Expected performance improvements with caching:

| Operation | Without Cache | With Cache | Improvement |
|-----------|--------------|------------|-------------|
| Get user profile | 15ms | 2ms | 7.5x faster |
| Unread notification count | 8ms | 1ms | 8x faster |
| Popular videos feed | 150ms | 5ms | 30x faster |
| Channel profile | 20ms | 2ms | 10x faster |

## References

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Cache-Aside Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Redis Node Client](https://github.com/redis/node-redis)
