/**
 * Follow Repository Implementation
 *
 * Handles follow/follower data access with Prisma.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, Follow } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IFollowRepository } from './interfaces';

@injectable()
export class FollowRepository implements IFollowRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(followerId: string, followingId: string): Promise<Follow> {
    return this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async findByFollowerAndFollowing(followerId: string, followingId: string): Promise<Follow | null> {
    return this.prisma.follow.findFirst({
      where: {
        followerId,
        followingId,
      },
    });
  }

  async delete(followerId: string, followingId: string): Promise<void> {
    const follow = await this.findByFollowerAndFollowing(followerId, followingId);
    if (follow) {
      await this.prisma.follow.delete({
        where: { id: follow.id },
      });
    }
  }

  async getFollowers(userId: string, limit: number = 20, offset: number = 0): Promise<Follow[]> {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            isCreator: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getFollowing(userId: string, limit: number = 20, offset: number = 0): Promise<Follow[]> {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            isCreator: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getFollowerCount(userId: string): Promise<number> {
    return this.prisma.follow.count({
      where: { followingId: userId },
    });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.prisma.follow.count({
      where: { followerId: userId },
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.findByFollowerAndFollowing(followerId, followingId);
    return follow !== null;
  }
}
