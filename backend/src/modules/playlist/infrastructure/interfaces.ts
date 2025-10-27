/**
 * Repository Interfaces for Playlist Module
 *
 * Defines contracts for playlist data access layer.
 */

import { Playlist, PlaylistVideo } from '@prisma/client';

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

export interface AddVideoToPlaylistDto {
  playlistId: string;
  videoId: string;
  position: number;
}

export interface ReorderVideoDto {
  videoId: string;
  newPosition: number;
}

/**
 * Playlist Repository Interface
 */
export interface IPlaylistRepository {
  create(data: CreatePlaylistDto): Promise<Playlist>;
  findById(id: string): Promise<Playlist | null>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Playlist[]>;
  update(id: string, data: UpdatePlaylistDto): Promise<Playlist>;
  delete(id: string): Promise<void>;
  incrementVideoCount(id: string): Promise<Playlist>;
  decrementVideoCount(id: string): Promise<Playlist>;
  updateThumbnail(id: string, thumbnailUrl: string | null): Promise<Playlist>;
}

/**
 * PlaylistVideo Repository Interface
 */
export interface IPlaylistVideoRepository {
  addVideo(data: AddVideoToPlaylistDto): Promise<PlaylistVideo>;
  findByPlaylistId(playlistId: string): Promise<PlaylistVideo[]>;
  findByVideoId(videoId: string): Promise<PlaylistVideo[]>;
  removeVideo(playlistId: string, videoId: string): Promise<void>;
  reorderVideos(playlistId: string, reorders: ReorderVideoDto[]): Promise<void>;
  getVideoCount(playlistId: string): Promise<number>;
  checkVideoExists(playlistId: string, videoId: string): Promise<boolean>;
}
