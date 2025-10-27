/**
 * Email Verification Repository Implementation
 *
 * Implements email verification data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, EmailVerification } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IEmailVerificationRepository, CreateEmailVerificationDto } from './interfaces';

@injectable()
export class EmailVerificationRepository implements IEmailVerificationRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateEmailVerificationDto): Promise<EmailVerification> {
    return this.prisma.emailVerification.create({
      data: {
        userId: data.userId,
        verificationCode: data.verificationCode,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByCode(code: string): Promise<EmailVerification | null> {
    return this.prisma.emailVerification.findFirst({
      where: {
        verificationCode: code,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findByUserId(userId: string): Promise<EmailVerification | null> {
    return this.prisma.emailVerification.findFirst({
      where: {
        userId,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsVerified(id: string): Promise<void> {
    await this.prisma.emailVerification.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.emailVerification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
