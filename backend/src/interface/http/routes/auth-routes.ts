/**
 * Authentication Routes
 *
 * Defines Fastify routes for authentication endpoints.
 */

import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth-controller';

export async function registerAuthRoutes(
  fastify: FastifyInstance,
  authController: AuthController
): Promise<void> {
  // Register
  fastify.post('/api/auth/register', async (request: any, reply: any) => {
    return authController.register(request, reply);
  });

  // Login
  fastify.post('/api/auth/login', async (request: any, reply: any) => {
    return authController.login(request, reply);
  });

  // Refresh token
  fastify.post('/api/auth/refresh', async (request: any, reply: any) => {
    return authController.refresh(request, reply);
  });

  // Logout
  fastify.post('/api/auth/logout', async (request: any, reply: any) => {
    return authController.logout(request, reply);
  });

  // Get profile
  fastify.get('/api/auth/me', async (request: any, reply: any) => {
    return authController.getProfile(request, reply);
  });

  // Update profile
  fastify.patch('/api/auth/profile', async (request: any, reply: any) => {
    return authController.updateProfile(request, reply);
  });

  // Change password
  fastify.patch('/api/auth/change-password', async (request: any, reply: any) => {
    return authController.changePassword(request, reply);
  });
}
