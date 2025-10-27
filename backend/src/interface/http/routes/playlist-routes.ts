/**
 * Playlist Routes
 *
 * Defines HTTP routes for playlist management.
 */

import { FastifyInstance } from 'fastify';
import { Container } from 'inversify';
import { TYPES } from '@/shared/types';
import { PlaylistController } from '@/interface/http/controllers/playlist-controller';

export async function playlistRoutes(fastify: FastifyInstance, container: Container): Promise<void> {
  const controller = container.get<PlaylistController>(TYPES.PlaylistController);

  // Playlist CRUD (authenticated)
  fastify.post('/api/playlists/create', async (request: any, reply: any) => {
    return controller.createPlaylist(request, reply);
  });

  fastify.get('/api/playlists/my-playlists', async (request: any, reply: any) => {
    return controller.getMyPlaylists(request, reply);
  });

  fastify.get('/api/playlists/:id', async (request: any, reply: any) => {
    return controller.getPlaylist(request, reply);
  });

  fastify.patch('/api/playlists/:id', async (request: any, reply: any) => {
    return controller.updatePlaylist(request, reply);
  });

  fastify.delete('/api/playlists/:id', async (request: any, reply: any) => {
    return controller.deletePlaylist(request, reply);
  });

  // Playlist video management (authenticated)
  fastify.post('/api/playlists/:id/videos/add', async (request: any, reply: any) => {
    return controller.addVideo(request, reply);
  });

  fastify.delete('/api/playlists/:id/videos/:videoId', async (request: any, reply: any) => {
    return controller.removeVideo(request, reply);
  });

  fastify.patch('/api/playlists/:id/videos/reorder', async (request: any, reply: any) => {
    return controller.reorderVideos(request, reply);
  });
}
