/**
 * PlaylistVideo Repository Implementation
 *
 * Implements playlist-video relationship data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, PlaylistVideo } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IPlaylistVideoRepository, AddVideoToPlaylistDto, ReorderVideoDto } from './interfaces';

@injectable()
export class PlaylistVideoRepository implements IPlaylistVideoRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async addVideo(data: AddVideoToPlaylistDto): Promise<PlaylistVideo> {
    return this.prisma.playlistVideo.create({
      data,
    });
  }

  async findByPlaylistId(playlistId: string): Promise<PlaylistVideo[]> {
    return this.prisma.playlistVideo.findMany({
      where: { playlistId },
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
    });
  }

  async findByVideoId(videoId: string): Promise<PlaylistVideo[]> {
    return this.prisma.playlistVideo.findMany({
      where: { videoId },
      include: {
        playlist: {
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
    });
  }

  async removeVideo(playlistId: string, videoId: string): Promise<void> {
    // Find the video to be removed
    const playlistVideo = await this.prisma.playlistVideo.findFirst({
      where: {
        playlistId,
        videoId,
      },
    });

    if (!playlistVideo) {
      throw new Error('Video not found in playlist');
    }

    // Delete the video
    await this.prisma.playlistVideo.delete({
      where: {
        id: playlistVideo.id,
      },
    });

    // Update positions of remaining videos
    await this.prisma.playlistVideo.updateMany({
      where: {
        playlistId,
        position: {
          gt: playlistVideo.position,
        },
      },
      data: {
        position: {
          decrement: 1,
        },
      },
    });
  }

  async reorderVideos(playlistId: string, reorders: ReorderVideoDto[]): Promise<void> {
    // Execute updates in a transaction
    await this.prisma.$transaction(
      reorders.map((reorder) =>
        this.prisma.playlistVideo.updateMany({
          where: {
            playlistId,
            videoId: reorder.videoId,
          },
          data: {
            position: reorder.newPosition,
          },
        })
      )
    );
  }

  async getVideoCount(playlistId: string): Promise<number> {
    return this.prisma.playlistVideo.count({
      where: { playlistId },
    });
  }

  async checkVideoExists(playlistId: string, videoId: string): Promise<boolean> {
    const count = await this.prisma.playlistVideo.count({
      where: {
        playlistId,
        videoId,
      },
    });
    return count > 0;
  }
}
