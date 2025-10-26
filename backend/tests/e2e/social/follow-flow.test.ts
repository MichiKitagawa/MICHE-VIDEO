import { test, expect } from '@playwright/test';

test.describe('Social E2E - Follow Flow', () => {
  test('should complete full follow and notification flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/channel/usr_789');
    await page.click('button:has-text("フォロー")');
    await expect(page.locator('button:has-text("フォロー中")')).toBeVisible();

    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user2@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.click('[aria-label="通知"]');
    await expect(page.locator('text=さんがフォローしました')).toBeVisible();
  });
});
