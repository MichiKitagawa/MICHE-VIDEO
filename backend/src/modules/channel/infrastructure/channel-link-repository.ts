/**
 * Channel Link Repository Implementation
 *
 * Handles channel social media links data access with Prisma.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, ChannelLink } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IChannelLinkRepository, CreateChannelLinkDto } from './interfaces';

@injectable()
export class ChannelLinkRepository implements IChannelLinkRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateChannelLinkDto): Promise<ChannelLink> {
    return this.prisma.channelLink.create({
      data,
    });
  }

  async findByChannelId(channelId: string): Promise<ChannelLink[]> {
    return this.prisma.channelLink.findMany({
      where: { channelId },
    });
  }

  async deleteByChannelId(channelId: string): Promise<void> {
    await this.prisma.channelLink.deleteMany({
      where: { channelId },
    });
  }

  async bulkCreate(
    channelId: string,
    links: Array<{ platform: string; url: string }>
  ): Promise<ChannelLink[]> {
    // Delete existing links first
    await this.deleteByChannelId(channelId);

    // Create new links
    const createdLinks = await Promise.all(
      links.map((link) =>
        this.prisma.channelLink.create({
          data: {
            channelId,
            platform: link.platform,
            url: link.url,
          },
        })
      )
    );

    return createdLinks;
  }
}
