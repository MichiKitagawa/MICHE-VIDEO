/**
 * Video Like Repository Implementation
 *
 * Implements video like data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, VideoLike } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IVideoLikeRepository } from './interfaces';

@injectable()
export class VideoLikeRepository implements IVideoLikeRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(videoId: string, userId: string): Promise<VideoLike> {
    return this.prisma.videoLike.create({
      data: {
        videoId,
        userId,
      },
    });
  }

  async findByVideoAndUser(videoId: string, userId: string): Promise<VideoLike | null> {
    return this.prisma.videoLike.findUnique({
      where: {
        videoId_userId: {
          videoId,
          userId,
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.videoLike.delete({
      where: { id },
    });
  }

  async deleteByVideoAndUser(videoId: string, userId: string): Promise<void> {
    await this.prisma.videoLike.deleteMany({
      where: {
        videoId,
        userId,
      },
    });
  }
}
