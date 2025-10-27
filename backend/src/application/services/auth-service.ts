/**
 * Authentication Service
 *
 * Implements authentication use cases (business logic).
 * Reference: docs/specs/features/01-authentication.md
 */

import { injectable, inject } from 'inversify';
import { User } from '@prisma/client';
import { TYPES } from '@/shared/types';
import {
  IUserRepository,
  ISessionRepository,
  IPasswordResetRepository,
  IEmailVerificationRepository,
} from '@/modules/auth/infrastructure/interfaces';
import { hashPassword, verifyPassword } from '@/modules/auth/domain/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@/modules/auth/domain/jwt-service';
import { validateEmail, validatePassword } from '@/shared/utils/validation';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  displayName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  deviceInfo?: any;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
}

@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: IUserRepository,
    @inject(TYPES.SessionRepository) private sessionRepo: ISessionRepository,
    @inject(TYPES.PasswordResetRepository) private passwordResetRepo: IPasswordResetRepository,
    @inject(TYPES.EmailVerificationRepository) private emailVerificationRepo: IEmailVerificationRepository
  ) {}

  /**
   * Register a new user.
   *
   * @throws Error if email is invalid, password is weak, or email already exists
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    // Validate input
    if (!validateEmail(dto.email)) {
      throw new Error('Invalid email format');
    }

    const passwordValidation = validatePassword(dto.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if email already exists
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(dto.password);

    // Create user
    const user = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      displayName: dto.displayName,
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    // Create session
    const refreshTokenHash = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.sessionRepo.create({
      userId: user.id,
      refreshTokenHash,
      expiresAt,
    });

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  /**
   * Login an existing user.
   *
   * @throws Error if credentials are invalid
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    // Find user by email
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login time
    await this.userRepo.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    // Create session
    const refreshTokenHash = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.sessionRepo.create({
      userId: user.id,
      refreshTokenHash,
      deviceInfo: dto.deviceInfo,
      expiresAt,
    });

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  /**
   * Refresh access token using refresh token.
   *
   * @throws Error if refresh token is invalid or expired
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find session
    const refreshTokenHash = await hashPassword(refreshToken);
    const session = await this.sessionRepo.findByRefreshTokenHash(refreshTokenHash);

    if (!session || session.isRevoked) {
      throw new Error('Invalid or revoked refresh token');
    }

    // Find user
    const user = await this.userRepo.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    return { accessToken };
  }

  /**
   * Logout user by revoking session.
   */
  async logout(sessionId: string): Promise<void> {
    await this.sessionRepo.revoke(sessionId);
  }

  /**
   * Logout all sessions for a user.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepo.revokeAllByUserId(userId);
  }

  /**
   * Get user profile by ID.
   */
  async getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user profile.
   */
  async updateProfile(
    userId: string,
    updates: { name?: string; displayName?: string; bio?: string; avatarUrl?: string }
  ): Promise<Omit<User, 'passwordHash'>> {
    const updatedUser = await this.userRepo.update(userId, updates);
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Change user password.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Find user
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`New password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await this.userRepo.update(userId, {
      passwordHash: newPasswordHash,
    });

    // Revoke all sessions (force re-login)
    await this.sessionRepo.revokeAllByUserId(userId);
  }
}
