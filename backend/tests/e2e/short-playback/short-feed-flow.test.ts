import { test, expect } from '@playwright/test';

/**
 * Short Playback E2E Flow Tests
 *
 * Tests complete user flows for short video playback
 * Reference: docs/tests/short-playback-tests.md
 */

test.describe('Short Playback E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
  });

  test('should browse shorts feed and engage', async ({ page }) => {
    await page.goto('/(tabs)/shorts');
    await expect(page).toHaveURL('/(tabs)/shorts');

    // Wait for first short to load
    await expect(page.locator('video')).toBeVisible({ timeout: 5000 });

    // Verify video is playing
    const video = page.locator('video').first();
    const isPlaying = await video.evaluate((v: HTMLVideoElement) => !v.paused);
    expect(isPlaying).toBe(true);

    // Like the short
    await page.click('button[aria-label="いいね"]');
    await expect(page.locator('button[aria-label="いいね"][data-liked="true"]')).toBeVisible();

    // Open comments
    await page.click('button[aria-label="コメント"]');
    await expect(page.locator('text=コメント')).toBeVisible();

    // Post comment
    await page.fill('textarea[placeholder="コメントを追加"]', '素晴らしい!');
    await page.click('button:has-text("投稿")');
    await expect(page.locator('text=素晴らしい!')).toBeVisible();
  });

  test('should filter shorts by category', async ({ page }) => {
    await page.goto('/(tabs)/shorts');

    // Open category filter
    await page.click('button[aria-label="カテゴリ"]');
    await expect(page.locator('text=ダンス')).toBeVisible();

    // Select dance category
    await page.click('text=ダンス');

    // Wait for filtered shorts
    await expect(page.locator('video')).toBeVisible();

    // Verify category badge
    await expect(page.locator('[data-category="dance"]')).toBeVisible();
  });

  test('should navigate between shorts with swipe', async ({ page }) => {
    await page.goto('/(tabs)/shorts');

    const firstShortId = await page.locator('[data-short-id]').first().getAttribute('data-short-id');

    // Swipe up to next short
    await page.locator('video').first().evaluate((el) => {
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientY: 500 } as any] }));
      el.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientY: 100 } as any] }));
      el.dispatchEvent(new TouchEvent('touchend', {}));
    });

    await page.waitForTimeout(500);

    const secondShortId = await page.locator('[data-short-id]').first().getAttribute('data-short-id');
    expect(secondShortId).not.toBe(firstShortId);
  });

  test('should show view count and engagement metrics', async ({ page }) => {
    await page.goto('/(tabs)/shorts');

    await expect(page.locator('[data-testid="view-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="like-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="comment-count"]')).toBeVisible();
  });

  test('should handle video playback controls', async ({ page }) => {
    await page.goto('/(tabs)/shorts');

    const video = page.locator('video').first();

    // Tap to pause
    await video.click();
    const isPaused = await video.evaluate((v: HTMLVideoElement) => v.paused);
    expect(isPaused).toBe(true);

    // Tap to resume
    await video.click();
    const isPlaying = await video.evaluate((v: HTMLVideoElement) => !v.paused);
    expect(isPlaying).toBe(true);
  });
});
