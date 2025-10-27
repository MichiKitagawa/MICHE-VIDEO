/**
 * Earning Repository Implementation
 *
 * Implements earning data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, Earning } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IEarningRepository, CreateEarningDto, EarningsStatsDto } from './interfaces';

@injectable()
export class EarningRepository implements IEarningRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateEarningDto): Promise<Earning> {
    return this.prisma.earning.create({
      data,
    });
  }

  async findById(id: string): Promise<Earning | null> {
    return this.prisma.earning.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string, limit: number = 20): Promise<Earning[]> {
    return this.prisma.earning.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async findAvailableByUserId(userId: string): Promise<Earning[]> {
    const now = new Date();
    return this.prisma.earning.findMany({
      where: {
        userId,
        status: 'available',
        availableAt: {
          lte: now,
        },
      },
      orderBy: {
        availableAt: 'asc',
      },
    });
  }

  async getStats(userId: string): Promise<EarningsStatsDto> {
    // Get available balance
    const availableEarnings = await this.prisma.earning.aggregate({
      where: {
        userId,
        status: 'available',
        availableAt: {
          lte: new Date(),
        },
      },
      _sum: {
        netAmount: true,
      },
    });

    // Get pending balance (not yet available)
    const pendingEarnings = await this.prisma.earning.aggregate({
      where: {
        userId,
        status: 'pending',
      },
      _sum: {
        netAmount: true,
      },
    });

    // Get this month's earnings
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEarnings = await this.prisma.earning.aggregate({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        netAmount: true,
      },
    });

    // Get total withdrawn
    const withdrawnEarnings = await this.prisma.earning.aggregate({
      where: {
        userId,
        status: 'withdrawn',
      },
      _sum: {
        netAmount: true,
      },
    });

    // Get breakdown by source type
    const tipEarnings = await this.prisma.earning.aggregate({
      where: {
        userId,
        sourceType: 'tip',
      },
      _sum: {
        netAmount: true,
      },
    });

    const superchatEarnings = await this.prisma.earning.aggregate({
      where: {
        userId,
        sourceType: 'superchat',
      },
      _sum: {
        netAmount: true,
      },
    });

    const subscriptionPoolEarnings = await this.prisma.earning.aggregate({
      where: {
        userId,
        sourceType: 'subscription_pool',
      },
      _sum: {
        netAmount: true,
      },
    });

    return {
      availableBalance: availableEarnings._sum.netAmount || 0,
      pendingBalance: pendingEarnings._sum.netAmount || 0,
      thisMonthEarnings: thisMonthEarnings._sum.netAmount || 0,
      totalWithdrawn: withdrawnEarnings._sum.netAmount || 0,
      breakdown: {
        tips: tipEarnings._sum.netAmount || 0,
        superchat: superchatEarnings._sum.netAmount || 0,
        subscriptionPool: subscriptionPoolEarnings._sum.netAmount || 0,
      },
    };
  }

  async updateStatus(id: string, status: string): Promise<Earning> {
    return this.prisma.earning.update({
      where: { id },
      data: { status },
    });
  }
}
