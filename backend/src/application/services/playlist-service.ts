/**
 * Playlist Service
 *
 * Handles playlist management operations.
 */

import { injectable, inject } from 'inversify';
import { Playlist, PlaylistVideo } from '@prisma/client';
import { TYPES } from '@/shared/types';
import {
  IPlaylistRepository,
  IPlaylistVideoRepository,
} from '@/modules/playlist/infrastructure/interfaces';
import { IVideoRepository } from '@/modules/video/infrastructure/interfaces';

export interface CreatePlaylistDto {
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
}

export interface UpdatePlaylistDto {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddVideoDto {
  userId: string;
  playlistId: string;
  videoId: string;
}

export interface RemoveVideoDto {
  userId: string;
  playlistId: string;
  videoId: string;
}

export interface ReorderVideosDto {
  userId: string;
  playlistId: string;
  videoOrders: Array<{ videoId: string; position: number }>;
}

const MAX_VIDEOS_PER_PLAYLIST = 500;

@injectable()
export class PlaylistService {
  constructor(
    @inject(TYPES.PlaylistRepository)
    private playlistRepository: IPlaylistRepository,
    @inject(TYPES.PlaylistVideoRepository)
    private playlistVideoRepository: IPlaylistVideoRepository,
    @inject(TYPES.VideoRepository)
    private videoRepository: IVideoRepository
  ) {}

  /**
   * Create a new playlist
   */
  async createPlaylist(dto: CreatePlaylistDto): Promise<Playlist> {
    // Validate name
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('Playlist name is required');
    }

    if (dto.name.length > 100) {
      throw new Error('Playlist name must be less than 100 characters');
    }

    return this.playlistRepository.create(dto);
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Playlist[]> {
    return this.playlistRepository.findByUserId(userId, limit, offset);
  }

  /**
   * Get playlist by ID
   */
  async getPlaylistById(playlistId: string, requestingUserId?: string): Promise<any> {
    const playlist = await this.playlistRepository.findById(playlistId);

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Check privacy
    if (!playlist.isPublic && playlist.userId !== requestingUserId) {
      throw new Error('You do not have permission to view this playlist');
    }

    return playlist;
  }

  /**
   * Update playlist
   */
  async updatePlaylist(
    playlistId: string,
    userId: string,
    dto: UpdatePlaylistDto
  ): Promise<Playlist> {
    const playlist = await this.playlistRepository.findById(playlistId);

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw new Error('You do not have permission to update this playlist');
    }

    // Validate name if provided
    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new Error('Playlist name cannot be empty');
      }
      if (dto.name.length > 100) {
        throw new Error('Playlist name must be less than 100 characters');
      }
    }

    return this.playlistRepository.update(playlistId, dto);
  }

  /**
   * Delete playlist
   */
  async deletePlaylist(playlistId: string, userId: string): Promise<void> {
    const playlist = await this.playlistRepository.findById(playlistId);

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw new Error('You do not have permission to delete this playlist');
    }

    await this.playlistRepository.delete(playlistId);
  }

  /**
   * Add video to playlist
   */
  async addVideoToPlaylist(dto: AddVideoDto): Promise<any> {
    const { userId, playlistId, videoId } = dto;

    // Check playlist ownership
    const playlist = await this.playlistRepository.findById(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw new Error('You do not have permission to modify this playlist');
    }

    // Check if video exists
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    // Check if video already in playlist
    const exists = await this.playlistVideoRepository.checkVideoExists(playlistId, videoId);
    if (exists) {
      throw new Error('Video is already in this playlist');
    }

    // Check playlist size limit
    const currentCount = await this.playlistVideoRepository.getVideoCount(playlistId);
    if (currentCount >= MAX_VIDEOS_PER_PLAYLIST) {
      throw new Error(`Playlist cannot contain more than ${MAX_VIDEOS_PER_PLAYLIST} videos`);
    }

    // Add video to playlist
    const playlistVideo = await this.playlistVideoRepository.addVideo({
      playlistId,
      videoId,
      position: currentCount, // Add to the end
    });

    // Increment video count
    await this.playlistRepository.incrementVideoCount(playlistId);

    // Update thumbnail if this is the first video
    if (currentCount === 0 && video.thumbnailUrl) {
      await this.playlistRepository.updateThumbnail(playlistId, video.thumbnailUrl);
    }

    return {
      message: 'Video added to playlist',
      playlistId,
      videoId,
      position: currentCount,
      videoCount: currentCount + 1,
    };
  }

  /**
   * Remove video from playlist
   */
  async removeVideoFromPlaylist(dto: RemoveVideoDto): Promise<void> {
    const { userId, playlistId, videoId } = dto;

    // Check playlist ownership
    const playlist = await this.playlistRepository.findById(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw new Error('You do not have permission to modify this playlist');
    }

    // Check if video exists in playlist
    const exists = await this.playlistVideoRepository.checkVideoExists(playlistId, videoId);
    if (!exists) {
      throw new Error('Video not found in playlist');
    }

    // Remove video
    await this.playlistVideoRepository.removeVideo(playlistId, videoId);

    // Decrement video count
    await this.playlistRepository.decrementVideoCount(playlistId);

    // Update thumbnail if needed
    const remainingVideos = await this.playlistVideoRepository.findByPlaylistId(playlistId);
    if (remainingVideos.length === 0) {
      await this.playlistRepository.updateThumbnail(playlistId, null);
    } else {
      const firstVideo = (remainingVideos[0] as any).video;
      if (firstVideo && firstVideo.thumbnailUrl) {
        // Set thumbnail to first video
        await this.playlistRepository.updateThumbnail(playlistId, firstVideo.thumbnailUrl);
      }
    }
  }

  /**
   * Reorder videos in playlist
   */
  async reorderVideos(dto: ReorderVideosDto): Promise<void> {
    const { userId, playlistId, videoOrders } = dto;

    // Check playlist ownership
    const playlist = await this.playlistRepository.findById(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw new Error('You do not have permission to modify this playlist');
    }

    // Validate reorder data
    if (!videoOrders || videoOrders.length === 0) {
      throw new Error('Video orders are required');
    }

    // Reorder videos
    await this.playlistVideoRepository.reorderVideos(
      playlistId,
      videoOrders.map((order) => ({
        videoId: order.videoId,
        newPosition: order.position,
      }))
    );

    // Update thumbnail to first video if needed
    const videos = await this.playlistVideoRepository.findByPlaylistId(playlistId);
    if (videos.length > 0) {
      const firstVideo = (videos[0] as any).video;
      if (firstVideo && firstVideo.thumbnailUrl) {
        await this.playlistRepository.updateThumbnail(playlistId, firstVideo.thumbnailUrl);
      }
    }
  }

  /**
   * Get playlists containing a video
   */
  async getPlaylistsForVideo(videoId: string, userId?: string): Promise<any[]> {
    const playlistVideos = await this.playlistVideoRepository.findByVideoId(videoId);

    // Filter by privacy and user
    return playlistVideos
      .filter((pv) => {
        const playlist = (pv as any).playlist;
        return playlist && (playlist.isPublic || playlist.userId === userId);
      })
      .map((pv) => (pv as any).playlist);
  }
}
