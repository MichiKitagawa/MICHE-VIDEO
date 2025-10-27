/**
 * Tip Repository Implementation
 *
 * Implements tip data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, Tip } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { ITipRepository, CreateTipDto } from './interfaces';

@injectable()
export class TipRepository implements ITipRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateTipDto): Promise<Tip> {
    return this.prisma.tip.create({
      data,
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Tip | null> {
    return this.prisma.tip.findUnique({
      where: { id },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findByFromUserId(userId: string, limit: number = 20): Promise<Tip[]> {
    return this.prisma.tip.findMany({
      where: { fromUserId: userId },
      include: {
        toUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async findByToUserId(userId: string, limit: number = 20): Promise<Tip[]> {
    return this.prisma.tip.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async findByContent(contentType: string, contentId: string): Promise<Tip[]> {
    return this.prisma.tip.findMany({
      where: {
        contentType,
        contentId,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(id: string, status: string): Promise<Tip> {
    return this.prisma.tip.update({
      where: { id },
      data: { status },
    });
  }
}
