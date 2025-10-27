/**
 * Video View Repository Implementation
 *
 * Implements video view tracking using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, VideoView } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IVideoViewRepository } from './interfaces';

@injectable()
export class VideoViewRepository implements IVideoViewRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(
    videoId: string,
    userId: string | null,
    ipAddress: string,
    duration: number
  ): Promise<VideoView> {
    return this.prisma.videoView.create({
      data: {
        videoId,
        userId,
        ipAddress,
        duration,
      },
    });
  }

  async findRecentView(
    videoId: string,
    userId: string | null,
    ipAddress: string,
    minutes: number
  ): Promise<VideoView | null> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    const where: any = {
      videoId,
      createdAt: {
        gte: cutoffTime,
      },
    };

    // Match by userId if provided, otherwise by IP
    if (userId) {
      where.userId = userId;
    } else {
      where.ipAddress = ipAddress;
      where.userId = null;
    }

    return this.prisma.videoView.findFirst({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
