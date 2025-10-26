import { test, expect } from '@playwright/test';

test.describe('Search E2E - Full Flow', () => {
  test('should complete full search to playback flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.click('input[placeholder="検索"]');
    await page.fill('input[placeholder="検索"]', 'プロ');

    await expect(page.locator('.search-suggestions')).toBeVisible();
    await expect(page.locator('.search-suggestions .suggestion-item')).toHaveCount.greaterThan(0);

    await page.fill('input[placeholder="検索"]', 'プログラミング');
    await page.press('input[placeholder="検索"]', 'Enter');

    await expect(page.url()).toContain('/search');
    await expect(page.locator('h1')).toContainText('プログラミング');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    await page.click('button:has-text("フィルター")');
    await expect(page.locator('.filter-modal')).toBeVisible();

    await page.click('input[value="education"]');
    await page.click('button:has-text("適用")');

    await expect(page.locator('.video-card')).toHaveCount.greaterThan(0);

    await page.click('.video-card:first-child');

    await expect(page.locator('video')).toBeVisible();

    await expect(page.locator('.related-videos')).toBeVisible();
    await expect(page.locator('.related-videos .video-card')).toHaveCount.greaterThan(0);

    await page.click('video');
    await expect(page.locator('video')).toHaveAttribute('playing', '');
  });
});
