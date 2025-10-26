import { test, expect } from '@playwright/test';

test.describe('Trending E2E - Trending Flow', () => {
  test('should view trending videos', async ({ page }) => {
    await page.goto('/trending');

    await expect(page.locator('h1')).toContainText('トレンド');
    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    const firstVideo = page.locator('.video-card:first-child');
    await expect(firstVideo.locator('.rank')).toContainText('1');

    await page.click('button:has-text("24時間")');
    await page.click('text=7日間');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    await page.click('select[name="category"]');
    await page.selectOption('select[name="category"]', 'gaming');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    await page.click('.video-card:first-child');

    await expect(page.locator('video')).toBeVisible();
  });
});
