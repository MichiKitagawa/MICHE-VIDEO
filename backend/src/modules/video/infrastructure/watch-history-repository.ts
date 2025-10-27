/**
 * Watch History Repository Implementation
 *
 * Implements watch history/progress tracking using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, WatchHistory } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IWatchHistoryRepository, UpdateProgressDto } from './interfaces';

@injectable()
export class WatchHistoryRepository implements IWatchHistoryRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async upsertProgress(data: UpdateProgressDto): Promise<WatchHistory> {
    // Calculate if video is completed (watched 95% or more)
    const completed = data.durationSeconds
      ? data.progressSeconds >= data.durationSeconds * 0.95
      : false;

    return this.prisma.watchHistory.upsert({
      where: {
        userId_videoId: {
          userId: data.userId,
          videoId: data.videoId,
        },
      },
      update: {
        progressSeconds: data.progressSeconds,
        durationSeconds: data.durationSeconds,
        completed,
        lastWatchedAt: new Date(),
      },
      create: {
        userId: data.userId,
        videoId: data.videoId,
        progressSeconds: data.progressSeconds,
        durationSeconds: data.durationSeconds,
        completed,
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
      },
    });
  }

  async findByUserAndVideo(userId: string, videoId: string): Promise<WatchHistory | null> {
    return this.prisma.watchHistory.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });
  }

  async findByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<WatchHistory[]> {
    return this.prisma.watchHistory.findMany({
      where: {
        userId,
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            duration: true,
            viewCount: true,
            likeCount: true,
            user: {
              select: {
                id: true,
                name: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastWatchedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  async deleteByUserAndVideo(userId: string, videoId: string): Promise<void> {
    await this.prisma.watchHistory.delete({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });
  }

  async deleteAllByUser(userId: string): Promise<number> {
    const result = await this.prisma.watchHistory.deleteMany({
      where: {
        userId,
      },
    });

    return result.count;
  }
}
