/**
 * Playlist Repository Implementation
 *
 * Implements playlist data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, Playlist } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IPlaylistRepository, CreatePlaylistDto, UpdatePlaylistDto } from './interfaces';

@injectable()
export class PlaylistRepository implements IPlaylistRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreatePlaylistDto): Promise<Playlist> {
    return this.prisma.playlist.create({
      data,
    });
  }

  async findById(id: string): Promise<Playlist | null> {
    return this.prisma.playlist.findUnique({
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
        playlistVideos: {
          include: {
            video: {
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
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  }

  async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<Playlist[]> {
    return this.prisma.playlist.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  async update(id: string, data: UpdatePlaylistDto): Promise<Playlist> {
    return this.prisma.playlist.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.playlist.delete({
      where: { id },
    });
  }

  async incrementVideoCount(id: string): Promise<Playlist> {
    return this.prisma.playlist.update({
      where: { id },
      data: {
        videoCount: {
          increment: 1,
        },
      },
    });
  }

  async decrementVideoCount(id: string): Promise<Playlist> {
    return this.prisma.playlist.update({
      where: { id },
      data: {
        videoCount: {
          decrement: 1,
        },
      },
    });
  }

  async updateThumbnail(id: string, thumbnailUrl: string | null): Promise<Playlist> {
    return this.prisma.playlist.update({
      where: { id },
      data: {
        thumbnailUrl,
      },
    });
  }
}
