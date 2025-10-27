/**
 * Repository Interfaces for Video Module
 *
 * Defines contracts for video data access layer.
 */

import { Video, VideoTag, VideoLike, VideoComment, VideoView } from '@prisma/client';

export interface CreateVideoDto {
  userId: string;
  title: string;
  description?: string;
  categoryId?: string;
  privacy: 'public' | 'unlisted' | 'private';
  isAdult: boolean;
  duration: number;
  s3Key?: string;
}

export interface UpdateVideoDto {
  title?: string;
  description?: string;
  categoryId?: string;
  privacy?: 'public' | 'unlisted' | 'private';
  isAdult?: boolean;
  thumbnailUrl?: string;
  hlsUrl?: string;
  status?: 'processing' | 'ready' | 'failed';
  publishedAt?: Date;
}

export interface VideoListFilters {
  userId?: string;
  categoryId?: string;
  privacy?: string;
  isAdult?: boolean;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Video Repository Interface
 */
export interface IVideoRepository {
  create(data: CreateVideoDto): Promise<Video>;
  findById(id: string): Promise<Video | null>;
  findMany(filters: VideoListFilters): Promise<Video[]>;
  update(id: string, data: UpdateVideoDto): Promise<Video>;
  delete(id: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
  incrementLikeCount(id: string): Promise<void>;
  decrementLikeCount(id: string): Promise<void>;
  incrementCommentCount(id: string): Promise<void>;
  decrementCommentCount(id: string): Promise<void>;
}

/**
 * Video Like Repository Interface
 */
export interface IVideoLikeRepository {
  create(videoId: string, userId: string): Promise<VideoLike>;
  findByVideoAndUser(videoId: string, userId: string): Promise<VideoLike | null>;
  delete(id: string): Promise<void>;
  deleteByVideoAndUser(videoId: string, userId: string): Promise<void>;
}

/**
 * Video Comment Repository Interface
 */
export interface IVideoCommentRepository {
  create(videoId: string, userId: string, content: string, parentId?: string): Promise<VideoComment>;
  findById(id: string): Promise<VideoComment | null>;
  findByVideoId(videoId: string, limit?: number, offset?: number): Promise<VideoComment[]>;
  update(id: string, content: string): Promise<VideoComment>;
  softDelete(id: string): Promise<void>;
}

/**
 * Video View Repository Interface
 */
export interface IVideoViewRepository {
  create(videoId: string, userId: string | null, ipAddress: string, duration: number): Promise<VideoView>;
  findRecentView(videoId: string, userId: string | null, ipAddress: string, minutes: number): Promise<VideoView | null>;
}
