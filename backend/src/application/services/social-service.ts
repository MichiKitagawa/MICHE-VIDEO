/**
 * Social Service
 *
 * Handles social features business logic (follow, notifications).
 */

import { injectable, inject } from 'inversify';
import { Follow, Notification, UserStats } from '@prisma/client';
import { TYPES } from '@/shared/types';
import {
  IFollowRepository,
  INotificationRepository,
  IUserStatsRepository,
  CreateNotificationDto,
} from '@/modules/social/infrastructure/interfaces';

@injectable()
export class SocialService {
  constructor(
    @inject(TYPES.FollowRepository) private followRepo: IFollowRepository,
    @inject(TYPES.NotificationRepository) private notificationRepo: INotificationRepository,
    @inject(TYPES.UserStatsRepository) private userStatsRepo: IUserStatsRepository
  ) {}

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    // Validate: cannot follow yourself
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following
    const existing = await this.followRepo.isFollowing(followerId, followingId);
    if (existing) {
      throw new Error('Already following this user');
    }

    // Create follow relationship
    const follow = await this.followRepo.create(followerId, followingId);

    // Update follower/following counts
    await this.userStatsRepo.incrementFollowingCount(followerId);
    await this.userStatsRepo.incrementFollowerCount(followingId);

    // Create notification for the followed user
    await this.notificationRepo.create({
      userId: followingId,
      type: 'new_follower',
      title: 'New Follower',
      message: 'You have a new follower!',
      actorId: followerId,
    });

    return follow;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    // Check if following
    const existing = await this.followRepo.isFollowing(followerId, followingId);
    if (!existing) {
      throw new Error('Not following this user');
    }

    // Delete follow relationship
    await this.followRepo.delete(followerId, followingId);

    // Update follower/following counts
    await this.userStatsRepo.decrementFollowingCount(followerId);
    await this.userStatsRepo.decrementFollowerCount(followingId);
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return this.followRepo.isFollowing(followerId, followingId);
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, limit?: number, offset?: number): Promise<Follow[]> {
    return this.followRepo.getFollowers(userId, limit, offset);
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, limit?: number, offset?: number): Promise<Follow[]> {
    return this.followRepo.getFollowing(userId, limit, offset);
  }

  /**
   * Get follower count
   */
  async getFollowerCount(userId: string): Promise<number> {
    return this.followRepo.getFollowerCount(userId);
  }

  /**
   * Get following count
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.followRepo.getFollowingCount(userId);
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    return this.userStatsRepo.findByUserId(userId);
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, limit?: number, offset?: number): Promise<Notification[]> {
    return this.notificationRepo.findByUserId(userId, limit, offset);
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<Notification> {
    // Verify ownership
    const notification = await this.notificationRepo.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Unauthorized to mark this notification as read');
    }

    return this.notificationRepo.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    return this.notificationRepo.markAllAsRead(userId);
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.notificationRepo.getUnreadCount(userId);
  }

  /**
   * Create notification (for internal use by other services)
   */
  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    return this.notificationRepo.create(data);
  }
}
