import { createNotification, shouldSendNotification } from '@/lib/social/notifications';

/**
 * Notification Generation Unit Tests
 * Reference: docs/tests/social-tests.md (TC-002, TC-003)
 */

describe('Notification Generation', () => {
  describe('Notification Creation', () => {
    it('should create new follower notification', async () => {
      const notification = await createNotification({
        user_id: 'usr_789',
        type: 'new_follower',
        title: '新しいフォロワー',
        message: '山田花子さんがフォローしました',
        actor_id: 'usr_456'
      });

      expect(notification.id).toBeDefined();
      expect(notification.type).toBe('new_follower');
      expect(notification.is_read).toBe(false);
    });

    it('should create new video notification', async () => {
      const notification = await createNotification({
        user_id: 'usr_123',
        type: 'new_video',
        title: '新しい動画が投稿されました',
        message: '田中太郎さんが動画を投稿しました',
        actor_id: 'usr_789',
        content_type: 'video',
        content_id: 'vid_123456',
        link_url: '/video/vid_123456'
      });

      expect(notification.content_type).toBe('video');
      expect(notification.link_url).toBe('/video/vid_123456');
    });
  });

  describe('Notification Filtering', () => {
    it('should send notification when setting is enabled', () => {
      const settings = {
        new_video: true,
        new_follower: true,
        push_notifications: true
      };
      const result = shouldSendNotification('new_video', settings);
      expect(result).toBe(true);
    });

    it('should not send notification when setting is disabled', () => {
      const settings = {
        new_video: false,
        new_follower: true,
        push_notifications: true
      };
      const result = shouldSendNotification('new_video', settings);
      expect(result).toBe(false);
    });

    it('should not send push when disabled globally', () => {
      const settings = {
        new_video: true,
        push_notifications: false
      };
      const result = shouldSendNotification('new_video', settings, 'push');
      expect(result).toBe(false);
    });
  });
});
