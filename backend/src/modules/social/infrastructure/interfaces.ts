/**
 * Repository Interfaces for Social Module
 *
 * Defines contracts for social features data access layer.
 */

import { Follow, Notification, UserStats } from '@prisma/client';

/**
 * Follow Repository Interface
 */
export interface IFollowRepository {
  create(followerId: string, followingId: string): Promise<Follow>;
  findByFollowerAndFollowing(followerId: string, followingId: string): Promise<Follow | null>;
  delete(followerId: string, followingId: string): Promise<void>;
  getFollowers(userId: string, limit?: number, offset?: number): Promise<Follow[]>;
  getFollowing(userId: string, limit?: number, offset?: number): Promise<Follow[]>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
}

/**
 * Notification Repository Interface
 */
export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  thumbnailUrl?: string;
  linkUrl?: string;
  actorId?: string;
  contentType?: string;
  contentId?: string;
}

export interface INotificationRepository {
  create(data: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<number>;
  delete(id: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}

/**
 * UserStats Repository Interface
 */
export interface IUserStatsRepository {
  create(userId: string): Promise<UserStats>;
  findByUserId(userId: string): Promise<UserStats | null>;
  incrementFollowerCount(userId: string): Promise<UserStats>;
  decrementFollowerCount(userId: string): Promise<UserStats>;
  incrementFollowingCount(userId: string): Promise<UserStats>;
  decrementFollowingCount(userId: string): Promise<UserStats>;
  incrementTotalViews(userId: string, count?: number): Promise<UserStats>;
  incrementTotalLikes(userId: string, count?: number): Promise<UserStats>;
  incrementTotalVideos(userId: string): Promise<UserStats>;
  decrementTotalVideos(userId: string): Promise<UserStats>;
}
