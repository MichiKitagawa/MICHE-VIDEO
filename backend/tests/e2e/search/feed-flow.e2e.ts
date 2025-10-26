import { test, expect } from '@playwright/test';

test.describe('Recommendations E2E - Feed Flow', () => {
  test('should complete recommendation feed to playback flow', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/videos');
    await expect(page.locator('h1')).toContainText('おすすめ');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    const firstVideo = page.locator('.video-card:first-child');
    await expect(firstVideo.locator('.recommendation-reason')).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const videoCountAfterScroll = await page.locator('.video-card').count();
    expect(videoCountAfterScroll).toBeGreaterThan(20);

    await page.click('.video-card:first-child');

    await expect(page.locator('video')).toBeVisible();

    await expect(page.locator('.recommendation-info')).toBeVisible();
  });
});
