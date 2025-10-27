/**
 * Video Routes
 *
 * Defines Fastify routes for video management endpoints.
 */

import { FastifyInstance } from 'fastify';
import { VideoController } from '../controllers/video-controller';

export async function registerVideoRoutes(
  fastify: FastifyInstance,
  videoController: VideoController
): Promise<void> {
  // Initiate upload
  fastify.post('/api/videos/upload', async (request: any, reply: any) => {
    return videoController.initiateUpload(request, reply);
  });

  // List videos
  fastify.get('/api/videos', async (request: any, reply: any) => {
    return videoController.listVideos(request, reply);
  });

  // Get video by ID
  fastify.get('/api/videos/:id', async (request: any, reply: any) => {
    return videoController.getVideo(request, reply);
  });

  // Update video
  fastify.patch('/api/videos/:id', async (request: any, reply: any) => {
    return videoController.updateVideo(request, reply);
  });

  // Delete video
  fastify.delete('/api/videos/:id', async (request: any, reply: any) => {
    return videoController.deleteVideo(request, reply);
  });

  // Like video (toggle)
  fastify.post('/api/videos/:id/like', async (request: any, reply: any) => {
    return videoController.likeVideo(request, reply);
  });

  // Add comment
  fastify.post('/api/videos/:id/comments', async (request: any, reply: any) => {
    return videoController.addComment(request, reply);
  });

  // Get comments
  fastify.get('/api/videos/:id/comments', async (request: any, reply: any) => {
    return videoController.getComments(request, reply);
  });

  // Update comment
  fastify.patch('/api/videos/:id/comments/:commentId', async (request: any, reply: any) => {
    return videoController.updateComment(request, reply);
  });

  // Delete comment
  fastify.delete('/api/videos/:id/comments/:commentId', async (request: any, reply: any) => {
    return videoController.deleteComment(request, reply);
  });

  // Record view
  fastify.post('/api/videos/:id/view', async (request: any, reply: any) => {
    return videoController.recordView(request, reply);
  });

  // Publish video
  fastify.post('/api/videos/:id/publish', async (request: any, reply: any) => {
    return videoController.publishVideo(request, reply);
  });
}
