/**
 * UserStats Repository Implementation
 *
 * Handles user statistics data access with Prisma.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, UserStats } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IUserStatsRepository } from './interfaces';

@injectable()
export class UserStatsRepository implements IUserStatsRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(userId: string): Promise<UserStats> {
    return this.prisma.userStats.create({
      data: { userId },
    });
  }

  async findByUserId(userId: string): Promise<UserStats | null> {
    return this.prisma.userStats.findUnique({
      where: { userId },
    });
  }

  async incrementFollowerCount(userId: string): Promise<UserStats> {
    // Ensure UserStats exists
    await this.ensureUserStats(userId);

    return this.prisma.userStats.update({
      where: { userId },
      data: { followerCount: { increment: 1 } },
    });
  }

  async decrementFollowerCount(userId: string): Promise<UserStats> {
    // Ensure UserStats exists
    await this.ensureUserStats(userId);

    return this.prisma.userStats.update({
      where: { userId },
      data: { followerCount: { decrement: 1 } },
    });
  }

  async incrementFollowingCount(userId: string): Promise<UserStats> {
    // Ensure UserStats exists
    await this.ensureUserStats(userId);

    return this.prisma.userStats.update({
      where: { userId },
      data: { followingCount: { increment: 1 } },
    });
  }

  async decrementFollowingCount(userId: string): Promise<UserStats> {
    // Ensure UserStats exists
    await this.ensureUserStats(userId);

    return this.prisma.userStats.update({
      where: { userId },
      data: { followingCount: { decrement: 1 } },
    });
  }

  async incrementTotalViews(userId: string, count: number = 1): Promise<UserStats> {
    // Ensure UserStats exists
    await this.ensureUserStats(userId);

    return this.prisma.userStats.update({
      where: { userId },
      data: { totalViews: { increment: count } },
    });
  }

  async incrementTotalLikes(userId: string, count: number = 1): Promise<UserStats> {
    // Ensure UserStats exists
    await this.ensureUserStats(userId);

    return this.prisma.userStats.update({
      where: { userId },
      data: { totalLikes: { increment: count } },
    });
  }

  async incrementTotalVideos(userId: string): Promise<UserStats> {
    // Ensure UserStats exists
    await this.ensureUserStats(userId);

    return this.prisma.userStats.update({
      where: { userId },
      data: { totalVideos: { increment: 1 } },
    });
  }

  async decrementTotalVideos(userId: string): Promise<UserStats> {
    // Ensure UserStats exists
    await this.ensureUserStats(userId);

    return this.prisma.userStats.update({
      where: { userId },
      data: { totalVideos: { decrement: 1 } },
    });
  }

  /**
   * Ensure UserStats record exists for the user
   */
  private async ensureUserStats(userId: string): Promise<void> {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      await this.create(userId);
    }
  }
}
