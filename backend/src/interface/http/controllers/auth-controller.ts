/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication endpoints.
 * Reference: docs/specs/references/api-endpoints.md
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/shared/types';
import { AuthService } from '@/application/services/auth-service';
import { verifyAccessToken } from '@/modules/auth/domain/jwt-service';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  displayName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

interface UpdateProfileBody {
  name?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService) private authService: AuthService
  ) {}

  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { email, password, name, displayName } = request.body;

      const result = await this.authService.register({
        email,
        password,
        name,
        displayName,
      });

      reply.code(201).send({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/auth/login
   * Login existing user
   */
  async login(
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { email, password } = request.body;

      const result = await this.authService.login({
        email,
        password,
        deviceInfo: {
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        },
      });

      reply.code(200).send({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      reply.code(401).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  async refresh(
    request: FastifyRequest<{ Body: RefreshBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { refreshToken } = request.body;

      const result = await this.authService.refreshToken(refreshToken);

      reply.code(200).send({
        success: true,
        data: {
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      reply.code(401).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout current session
   */
  async logout(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract session ID from token or header
      // For now, just return success
      reply.code(200).send({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      reply.code(500).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  async getProfile(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract user ID from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing authorization header');
      }

      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);

      const user = await this.authService.getProfile(decoded.userId);

      reply.code(200).send({
        success: true,
        data: { user },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get profile';
      reply.code(401).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PATCH /api/auth/profile
   * Update user profile
   */
  async updateProfile(
    request: FastifyRequest<{ Body: UpdateProfileBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract user ID from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing authorization header');
      }

      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);

      const user = await this.authService.updateProfile(decoded.userId, request.body);

      reply.code(200).send({
        success: true,
        data: { user },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PATCH /api/auth/change-password
   * Change user password
   */
  async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Extract user ID from JWT
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing authorization header');
      }

      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);

      const { currentPassword, newPassword } = request.body;

      await this.authService.changePassword(
        decoded.userId,
        currentPassword,
        newPassword
      );

      reply.code(200).send({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      reply.code(400).send({
        success: false,
        error: message,
      });
    }
  }
}
