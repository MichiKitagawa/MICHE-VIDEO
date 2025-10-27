/**
 * Repository Interfaces for Authentication Module
 *
 * Defines contracts for data access layer.
 */

import { User, UserSession, PasswordReset, EmailVerification } from '@prisma/client';

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  name: string;
  displayName?: string;
}

export interface UpdateUserDto {
  name?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  isEmailVerified?: boolean;
  isCreator?: boolean;
  lastLoginAt?: Date;
  passwordHash?: string;
}

export interface CreateSessionDto {
  userId: string;
  refreshTokenHash: string;
  deviceInfo?: any;
  expiresAt: Date;
}

export interface CreatePasswordResetDto {
  userId: string;
  resetTokenHash: string;
  expiresAt: Date;
}

export interface CreateEmailVerificationDto {
  userId: string;
  verificationCode: string;
  expiresAt: Date;
}

/**
 * User Repository Interface
 */
export interface IUserRepository {
  create(data: CreateUserDto): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
}

/**
 * Session Repository Interface
 */
export interface ISessionRepository {
  create(data: CreateSessionDto): Promise<UserSession>;
  findById(id: string): Promise<UserSession | null>;
  findByRefreshTokenHash(hash: string): Promise<UserSession | null>;
  findByUserId(userId: string): Promise<UserSession[]>;
  revoke(id: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

/**
 * Password Reset Repository Interface
 */
export interface IPasswordResetRepository {
  create(data: CreatePasswordResetDto): Promise<PasswordReset>;
  findByTokenHash(hash: string): Promise<PasswordReset | null>;
  markAsUsed(id: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

/**
 * Email Verification Repository Interface
 */
export interface IEmailVerificationRepository {
  create(data: CreateEmailVerificationDto): Promise<EmailVerification>;
  findByCode(code: string): Promise<EmailVerification | null>;
  findByUserId(userId: string): Promise<EmailVerification | null>;
  markAsVerified(id: string): Promise<void>;
  deleteExpired(): Promise<void>;
}
