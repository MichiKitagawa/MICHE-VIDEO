/**
 * Notification Repository Implementation
 *
 * Handles notification data access with Prisma.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, Notification } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { INotificationRepository, CreateNotificationDto } from './interfaces';

@injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateNotificationDto): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
    return result.count;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}
