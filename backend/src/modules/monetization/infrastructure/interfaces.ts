/**
 * Repository Interfaces for Monetization Module
 *
 * Defines contracts for tips and earnings data access layer.
 */

import { Tip, Earning } from '@prisma/client';

export interface CreateTipDto {
  fromUserId: string;
  toUserId: string;
  contentType: 'video' | 'short' | 'live';
  contentId: string;
  amount: number;
  message?: string;
  paymentProvider: 'stripe' | 'ccbill';
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface CreateEarningDto {
  userId: string;
  sourceType: 'tip' | 'superchat' | 'subscription_pool';
  sourceId?: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  paymentProvider?: 'stripe' | 'ccbill';
  transactionId?: string;
  status: 'pending' | 'available' | 'withdrawn';
  availableAt?: Date;
}

export interface EarningsStatsDto {
  availableBalance: number;
  pendingBalance: number;
  thisMonthEarnings: number;
  totalWithdrawn: number;
  breakdown: {
    tips: number;
    superchat: number;
    subscriptionPool: number;
  };
}

/**
 * Tip Repository Interface
 */
export interface ITipRepository {
  create(data: CreateTipDto): Promise<Tip>;
  findById(id: string): Promise<Tip | null>;
  findByFromUserId(userId: string, limit?: number): Promise<Tip[]>;
  findByToUserId(userId: string, limit?: number): Promise<Tip[]>;
  findByContent(contentType: string, contentId: string): Promise<Tip[]>;
  updateStatus(id: string, status: string): Promise<Tip>;
}

/**
 * Earning Repository Interface
 */
export interface IEarningRepository {
  create(data: CreateEarningDto): Promise<Earning>;
  findById(id: string): Promise<Earning | null>;
  findByUserId(userId: string, limit?: number): Promise<Earning[]>;
  findAvailableByUserId(userId: string): Promise<Earning[]>;
  getStats(userId: string): Promise<EarningsStatsDto>;
  updateStatus(id: string, status: string): Promise<Earning>;
}
