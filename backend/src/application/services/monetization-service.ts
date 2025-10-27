/**
 * Monetization Service
 *
 * Handles tips, earnings, and withdrawal operations.
 */

import { injectable, inject } from 'inversify';
import { Tip, Earning } from '@prisma/client';
import Stripe from 'stripe';
import { TYPES } from '@/shared/types';
import {
  ITipRepository,
  IEarningRepository,
  EarningsStatsDto,
} from '@/modules/monetization/infrastructure/interfaces';
import { IVideoRepository } from '@/modules/video/infrastructure/interfaces';
import * as stripeClient from '@/shared/infrastructure/stripe-client';

export interface SendTipDto {
  fromUserId: string;
  contentType: 'video' | 'short' | 'live';
  contentId: string;
  amount: number;
  message?: string;
}

export interface TipResult {
  tip: Tip;
  payment: {
    transactionId: string;
    receiptUrl?: string;
  };
}

@injectable()
export class MonetizationService {
  constructor(
    @inject(TYPES.TipRepository)
    private tipRepository: ITipRepository,
    @inject(TYPES.EarningRepository)
    private earningRepository: IEarningRepository,
    @inject(TYPES.VideoRepository)
    private videoRepository: IVideoRepository
  ) {}

  /**
   * Send a tip to content creator
   */
  async sendTip(dto: SendTipDto): Promise<TipResult> {
    const { fromUserId, contentType, contentId, amount, message } = dto;

    // Validate amount (minimum ¥100)
    if (amount < 100) {
      throw new Error('Minimum tip amount is ¥100');
    }

    // Get content owner
    let toUserId: string;
    if (contentType === 'video') {
      const video = await this.videoRepository.findById(contentId);
      if (!video) {
        throw new Error('Video not found');
      }
      toUserId = video.userId;
    } else {
      // For now, only video tips are supported (shorts and live are Stretch Goals)
      throw new Error(`Content type '${contentType}' is not yet supported`);
    }

    // Cannot tip yourself
    if (fromUserId === toUserId) {
      throw new Error('You cannot tip yourself');
    }

    // Create Stripe Payment Intent
    const stripe = stripeClient.getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in JPY (Stripe uses smallest currency unit, JPY doesn't have decimals)
      currency: 'jpy',
      metadata: {
        type: 'tip',
        fromUserId,
        toUserId,
        contentType,
        contentId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create tip record
    const tip = await this.tipRepository.create({
      fromUserId,
      toUserId,
      contentType,
      contentId,
      amount,
      message,
      paymentProvider: 'stripe',
      transactionId: paymentIntent.id,
      status: 'pending',
    });

    // Calculate platform fee (30%)
    const platformFee = Math.floor(amount * 0.3);
    const netAmount = amount - platformFee;

    // Create earning record (available after 14 days)
    const availableAt = new Date();
    availableAt.setDate(availableAt.getDate() + 14);

    await this.earningRepository.create({
      userId: toUserId,
      sourceType: 'tip',
      sourceId: tip.id,
      amount,
      platformFee,
      netAmount,
      paymentProvider: 'stripe',
      transactionId: paymentIntent.id,
      status: 'pending',
      availableAt,
    });

    return {
      tip,
      payment: {
        transactionId: paymentIntent.id,
        receiptUrl: undefined, // Receipt URL available after payment confirmation via webhook
      },
    };
  }

  /**
   * Confirm tip payment (called by Stripe webhook)
   */
  async confirmTipPayment(paymentIntentId: string, status: 'succeeded' | 'failed'): Promise<void> {
    // Find tip by transaction ID
    const tips = await this.prisma.tip.findMany({
      where: { transactionId: paymentIntentId },
    });

    if (tips.length === 0) {
      console.error(`Tip not found for payment intent: ${paymentIntentId}`);
      return;
    }

    const tip = tips[0];
    const newStatus = status === 'succeeded' ? 'completed' : 'failed';

    // Update tip status
    await this.tipRepository.updateStatus(tip.id, newStatus);

    // Update earning status
    if (status === 'succeeded') {
      const earnings = await this.prisma.earning.findMany({
        where: {
          sourceType: 'tip',
          sourceId: tip.id,
        },
      });

      if (earnings.length > 0) {
        await this.earningRepository.updateStatus(earnings[0].id, 'available');
      }
    } else {
      // Delete earning if payment failed
      const earnings = await this.prisma.earning.findMany({
        where: {
          sourceType: 'tip',
          sourceId: tip.id,
        },
      });

      if (earnings.length > 0) {
        await this.prisma.earning.delete({
          where: { id: earnings[0].id },
        });
      }
    }
  }

  /**
   * Get tips sent by a user
   */
  async getSentTips(userId: string, limit: number = 20): Promise<Tip[]> {
    return this.tipRepository.findByFromUserId(userId, limit);
  }

  /**
   * Get tips received by a user
   */
  async getReceivedTips(userId: string, limit: number = 20): Promise<Tip[]> {
    return this.tipRepository.findByToUserId(userId, limit);
  }

  /**
   * Get tips for specific content
   */
  async getContentTips(contentType: string, contentId: string): Promise<Tip[]> {
    return this.tipRepository.findByContent(contentType, contentId);
  }

  /**
   * Get earnings statistics for creator
   */
  async getEarningsStats(userId: string): Promise<EarningsStatsDto> {
    return this.earningRepository.getStats(userId);
  }

  /**
   * Get earnings history for creator
   */
  async getEarningsHistory(userId: string, limit: number = 20): Promise<Earning[]> {
    return this.earningRepository.findByUserId(userId, limit);
  }

  // Temporary access to Prisma for direct queries
  // TODO: Refactor to use repositories
  private get prisma() {
    return (this.tipRepository as any).prisma;
  }
}
