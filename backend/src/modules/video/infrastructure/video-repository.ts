/**
 * Video Repository Implementation
 *
 * Implements video data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, Video } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IVideoRepository, CreateVideoDto, UpdateVideoDto, VideoListFilters } from './interfaces';

@injectable()
export class VideoRepository implements IVideoRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateVideoDto): Promise<Video> {
    return this.prisma.video.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        privacy: data.privacy,
        isAdult: data.isAdult,
        duration: data.duration,
        s3Key: data.s3Key,
        status: 'processing',
      },
    });
  }

  async findById(id: string): Promise<Video | null> {
    return this.prisma.video.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            isCreator: true,
          },
        },
        category: true,
        tags: true,
      },
    });
  }

  async findMany(filters: VideoListFilters): Promise<Video[]> {
    const {
      userId,
      categoryId,
      privacy,
      isAdult,
      status,
      search,
      limit = 20,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (categoryId) where.categoryId = categoryId;
    if (privacy) where.privacy = privacy;
    if (isAdult !== undefined) where.isAdult = isAdult;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          tags: {
            some: {
              tag: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    return this.prisma.video.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            isCreator: true,
          },
        },
        category: true,
        tags: true,
      },
      orderBy: { [orderBy]: orderDirection },
      take: limit,
      skip: offset,
    });
  }

  async update(id: string, data: UpdateVideoDto): Promise<Video> {
    return this.prisma.video.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.video.delete({
      where: { id },
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.video.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async incrementLikeCount(id: string): Promise<void> {
    await this.prisma.video.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
    });
  }

  async decrementLikeCount(id: string): Promise<void> {
    await this.prisma.video.update({
      where: { id },
      data: { likeCount: { decrement: 1 } },
    });
  }

  async incrementCommentCount(id: string): Promise<void> {
    await this.prisma.video.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
    });
  }

  async decrementCommentCount(id: string): Promise<void> {
    await this.prisma.video.update({
      where: { id },
      data: { commentCount: { decrement: 1 } },
    });
  }
}
