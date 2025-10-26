import { test, expect } from '@playwright/test';

test.describe('Netflix Series E2E - Episode Playback Flow', () => {
  test('should complete series episode playback flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'premium@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/netflix');

    await page.click('select[name="type"]');
    await page.selectOption('select[name="type"]', 'series');

    await page.click('.netflix-card:first-child');

    await expect(page.locator('.seasons-list')).toBeVisible();

    await page.click('button:has-text("シーズン1")');

    await expect(page.locator('.episodes-list')).toBeVisible();
    await expect(page.locator('.episode-card')).toHaveCount.greaterThan(0);

    await page.click('.episode-card:first-child');

    await expect(page.locator('video')).toBeVisible();

    await page.waitForTimeout(5000);

    await page.click('button:has-text("次のエピソード")');

    await expect(page.locator('video')).toBeVisible();
  });
});
