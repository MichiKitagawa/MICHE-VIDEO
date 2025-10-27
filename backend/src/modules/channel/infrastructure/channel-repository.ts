/**
 * Channel Repository Implementation
 *
 * Handles channel data access with Prisma.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, Channel } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IChannelRepository, CreateChannelDto, UpdateChannelDto } from './interfaces';

@injectable()
export class ChannelRepository implements IChannelRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateChannelDto): Promise<Channel> {
    return this.prisma.channel.create({
      data,
    });
  }

  async findById(id: string): Promise<Channel | null> {
    return this.prisma.channel.findUnique({
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
        links: true,
      },
    });
  }

  async findByUserId(userId: string): Promise<Channel | null> {
    return this.prisma.channel.findUnique({
      where: { userId },
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
        links: true,
      },
    });
  }

  async update(id: string, data: UpdateChannelDto): Promise<Channel> {
    return this.prisma.channel.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.channel.delete({
      where: { id },
    });
  }

  async incrementSubscriberCount(id: string): Promise<Channel> {
    return this.prisma.channel.update({
      where: { id },
      data: { subscriberCount: { increment: 1 } },
    });
  }

  async decrementSubscriberCount(id: string): Promise<Channel> {
    return this.prisma.channel.update({
      where: { id },
      data: { subscriberCount: { decrement: 1 } },
    });
  }

  async incrementTotalViews(id: string, count: number = 1): Promise<Channel> {
    return this.prisma.channel.update({
      where: { id },
      data: { totalViews: { increment: count } },
    });
  }

  async incrementTotalVideos(id: string): Promise<Channel> {
    return this.prisma.channel.update({
      where: { id },
      data: { totalVideos: { increment: 1 } },
    });
  }

  async decrementTotalVideos(id: string): Promise<Channel> {
    return this.prisma.channel.update({
      where: { id },
      data: { totalVideos: { decrement: 1 } },
    });
  }
}
