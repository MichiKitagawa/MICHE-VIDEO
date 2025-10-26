import { test, expect } from '@playwright/test';

/**
 * Monetization E2E - Tip Flow Tests
 * Complete tip sending and earnings flow
 * Reference: docs/tests/monetization-tests.md (TC-201)
 */

test.describe('Monetization E2E - Tip Flow', () => {
  test('should complete full tip sending and earnings flow', async ({ page }) => {
    // Login as viewer
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'viewer@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Navigate to video
    await page.goto('/video/vid_123456');
    await page.waitForSelector('video');

    // Click tip button
    await page.click('button:has-text("投げ銭")');
    await expect(page.locator('dialog')).toBeVisible();

    // Select amount
    await page.click('button:has-text("¥1,000")');
    await page.fill('textarea[name="message"]', '素晴らしい動画でした！');
    await page.click('button:has-text("送信")');

    // Verify success
    await expect(page.locator('text=投げ銭を送信しました')).toBeVisible();

    // Login as creator
    await page.goto('/(tabs)/settings');
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Check earnings
    await page.goto('/creation/');
    await page.click('text=収益');
    await expect(page.locator('text=出金可能残高')).toBeVisible();
    await expect(page.locator('text=保留中残高')).toBeVisible();
  });
});
