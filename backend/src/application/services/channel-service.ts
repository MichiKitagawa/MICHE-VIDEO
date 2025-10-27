/**
 * Channel Service
 *
 * Handles channel/creator profile business logic.
 */

import { injectable, inject } from 'inversify';
import { Channel } from '@prisma/client';
import { TYPES } from '@/shared/types';
import {
  IChannelRepository,
  IChannelLinkRepository,
  CreateChannelDto,
  UpdateChannelDto,
} from '@/modules/channel/infrastructure/interfaces';
import { IUserRepository } from '@/modules/auth/infrastructure/interfaces';
import { IUserStatsRepository } from '@/modules/social/infrastructure/interfaces';

@injectable()
export class ChannelService {
  constructor(
    @inject(TYPES.ChannelRepository) private channelRepo: IChannelRepository,
    @inject(TYPES.ChannelLinkRepository) private channelLinkRepo: IChannelLinkRepository,
    @inject(TYPES.UserRepository) private userRepo: IUserRepository,
    @inject(TYPES.UserStatsRepository) private userStatsRepo: IUserStatsRepository
  ) {}

  /**
   * Create a channel for a user
   */
  async createChannel(userId: string, name: string, description?: string): Promise<Channel> {
    // Check if user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is a creator
    if (!user.isCreator) {
      throw new Error('User must be a creator to create a channel');
    }

    // Check if channel already exists
    const existingChannel = await this.channelRepo.findByUserId(userId);
    if (existingChannel) {
      throw new Error('Channel already exists for this user');
    }

    // Validate name
    if (!name || name.trim().length === 0) {
      throw new Error('Channel name is required');
    }

    if (name.length > 100) {
      throw new Error('Channel name must be less than 100 characters');
    }

    // Create channel
    return this.channelRepo.create({ userId, name, description });
  }

  /**
   * Get channel by ID (public)
   */
  async getChannelById(channelId: string): Promise<any> {
    const channel = await this.channelRepo.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Get user stats for additional info
    const userStats = await this.userStatsRepo.findByUserId((channel as any).userId);

    return {
      ...channel,
      stats: userStats || {
        followerCount: 0,
        followingCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalVideos: 0,
        totalShorts: 0,
      },
    };
  }

  /**
   * Get channel by user ID
   */
  async getChannelByUserId(userId: string): Promise<any> {
    const channel = await this.channelRepo.findByUserId(userId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Get user stats for additional info
    const userStats = await this.userStatsRepo.findByUserId(userId);

    return {
      ...channel,
      stats: userStats || {
        followerCount: 0,
        followingCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalVideos: 0,
        totalShorts: 0,
      },
    };
  }

  /**
   * Get my channel (authenticated user)
   */
  async getMyChannel(userId: string): Promise<any> {
    // Check if user is a creator
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isCreator) {
      throw new Error('User must be a creator to have a channel');
    }

    // Get or create channel
    let channel = await this.channelRepo.findByUserId(userId);
    if (!channel) {
      // Auto-create channel for creator
      channel = await this.channelRepo.create({
        userId,
        name: user.displayName || user.name,
        description: user.bio || undefined,
      });
    }

    // Get user stats for additional info
    const userStats = await this.userStatsRepo.findByUserId(userId);

    return {
      ...channel,
      stats: userStats || {
        followerCount: 0,
        followingCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalVideos: 0,
        totalShorts: 0,
      },
    };
  }

  /**
   * Update channel
   */
  async updateChannel(
    userId: string,
    data: UpdateChannelDto & { links?: Array<{ platform: string; url: string }> }
  ): Promise<Channel> {
    // Get channel
    const channel = await this.channelRepo.findByUserId(userId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error('Channel name cannot be empty');
      }
      if (data.name.length > 100) {
        throw new Error('Channel name must be less than 100 characters');
      }
    }

    // Update channel basic info
    const { links, ...channelData } = data;
    const updatedChannel = await this.channelRepo.update(channel.id, channelData);

    // Update links if provided
    if (links) {
      await this.channelLinkRepo.bulkCreate(channel.id, links);
    }

    return updatedChannel;
  }

  /**
   * Apply to become a creator
   */
  async applyForCreator(userId: string): Promise<any> {
    // Check if user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if already a creator
    if (user.isCreator) {
      throw new Error('User is already a creator');
    }

    // Auto-approve (MVP version - no manual review)
    await this.userRepo.update(userId, { isCreator: true });

    // Create channel
    const channel = await this.channelRepo.create({
      userId,
      name: user.displayName || user.name,
      description: user.bio || undefined,
    });

    return {
      message: 'Creator application approved',
      isCreator: true,
      channel,
    };
  }
}
