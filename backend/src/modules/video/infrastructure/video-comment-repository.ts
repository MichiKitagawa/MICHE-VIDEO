/**
 * Video Comment Repository Implementation
 *
 * Implements video comment data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, VideoComment } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IVideoCommentRepository } from './interfaces';

@injectable()
export class VideoCommentRepository implements IVideoCommentRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(
    videoId: string,
    userId: string,
    content: string,
    parentId?: string
  ): Promise<VideoComment> {
    return this.prisma.videoComment.create({
      data: {
        videoId,
        userId,
        content,
        parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<VideoComment | null> {
    return this.prisma.videoComment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findByVideoId(
    videoId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<VideoComment[]> {
    return this.prisma.videoComment.findMany({
      where: {
        videoId,
        deletedAt: null,
        parentId: null, // Top-level comments only
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  async update(id: string, content: string): Promise<VideoComment> {
    return this.prisma.videoComment.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.videoComment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
