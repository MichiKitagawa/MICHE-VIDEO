/**
 * Repository Interfaces for Channel Module
 *
 * Defines contracts for channel data access layer.
 */

import { Channel, ChannelLink } from '@prisma/client';

export interface CreateChannelDto {
  userId: string;
  name: string;
  description?: string;
}

export interface UpdateChannelDto {
  name?: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

export interface CreateChannelLinkDto {
  channelId: string;
  platform: string;
  url: string;
}

/**
 * Channel Repository Interface
 */
export interface IChannelRepository {
  create(data: CreateChannelDto): Promise<Channel>;
  findById(id: string): Promise<Channel | null>;
  findByUserId(userId: string): Promise<Channel | null>;
  update(id: string, data: UpdateChannelDto): Promise<Channel>;
  delete(id: string): Promise<void>;
  incrementSubscriberCount(id: string): Promise<Channel>;
  decrementSubscriberCount(id: string): Promise<Channel>;
  incrementTotalViews(id: string, count?: number): Promise<Channel>;
  incrementTotalVideos(id: string): Promise<Channel>;
  decrementTotalVideos(id: string): Promise<Channel>;
}

/**
 * Channel Link Repository Interface
 */
export interface IChannelLinkRepository {
  create(data: CreateChannelLinkDto): Promise<ChannelLink>;
  findByChannelId(channelId: string): Promise<ChannelLink[]>;
  deleteByChannelId(channelId: string): Promise<void>;
  bulkCreate(channelId: string, links: Array<{ platform: string; url: string }>): Promise<ChannelLink[]>;
}
