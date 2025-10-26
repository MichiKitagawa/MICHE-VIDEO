import { test, expect, Page } from '@playwright/test';

/**
 * Video Playback E2E Flow Tests
 *
 * Tests complete playback workflow:
 * 1. Watch video
 * 2. Save progress
 * 3. Like video
 * 4. Comment
 * 5. View recommendations
 * 6. Watch next video
 *
 * Reference: docs/tests/video-playback-tests.md
 */

test.describe('Video Playback Complete Flow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/(tabs)/videos');
  });

  test('should complete full playback workflow', async () => {
    // Navigate to video
    await page.click('text=素晴らしい動画タイトル');
    await expect(page).toHaveURL(/\/video\/.+/);

    // Wait for video player
    await page.waitForSelector('video');

    // Like video
    await page.click('button[aria-label="いいね"]');
    await expect(page.locator('button[aria-label="いいね"]')).toHaveClass(/active/);

    // Post comment
    await page.fill('textarea[name="comment"]', '素晴らしい動画でした！');
    await page.click('button:has-text("送信")');
    await expect(page.locator('text=素晴らしい動画でした！')).toBeVisible();

    // Check recommendations
    await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();

    // Click first recommendation
    await page.locator('[data-testid="recommendation-item"]').first().click();
    await page.waitForTimeout(1000);
  });

  test('should resume from last watched position', async () => {
    await page.goto('/video/vid_123456');
    const video = page.locator('video');
    await video.evaluate(v => (v as HTMLVideoElement).currentTime = 120);
    await page.waitForTimeout(2000);

    await page.goto('/(tabs)/videos');
    await page.goto('/video/vid_123456');
    await page.waitForTimeout(1000);

    const currentTime = await video.evaluate(v => (v as HTMLVideoElement).currentTime);
    expect(currentTime).toBeGreaterThan(110);
  });

  test('should autoplay recommended videos', async () => {
    await page.goto('/video/vid_123456');
    await page.click('[data-testid="autoplay-toggle"]');

    const video = page.locator('video');
    await video.evaluate(v => {
      const vid = v as HTMLVideoElement;
      vid.currentTime = vid.duration - 1;
    });

    await page.waitForTimeout(3000);
  });
});
