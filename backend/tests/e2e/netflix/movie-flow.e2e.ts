import { test, expect } from '@playwright/test';

test.describe('Netflix Movie E2E - Playback Flow', () => {
  test('should complete movie search to playback flow', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'premium@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/netflix');
    await expect(page.locator('h1')).toContainText('Netflix');

    await page.click('select[name="type"]');
    await page.selectOption('select[name="type"]', 'movie');

    await expect(page.locator('.netflix-card')).toHaveCount.greaterThan(0);

    await page.click('.netflix-card:first-child');

    await expect(page.locator('.netflix-detail')).toBeVisible();
    await expect(page.locator('h1')).toBeDefined();
    await expect(page.locator('.poster-image')).toBeVisible();
    await expect(page.locator('.backdrop-image')).toBeVisible();

    await page.click('button:has-text("再生")');

    await expect(page.locator('video')).toBeVisible();

    await page.waitForTimeout(5000);

    const videoElement = await page.locator('video');
    const currentTime = await videoElement.evaluate((el: any) => el.currentTime);
    expect(currentTime).toBeGreaterThan(0);
  });
});
