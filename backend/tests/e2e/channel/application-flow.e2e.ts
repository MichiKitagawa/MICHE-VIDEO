import { test, expect } from '@playwright/test';

test.describe('Creator Application E2E - Full Flow', () => {
  test('should complete creator application process', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/settings');
    await page.click('text=クリエイターになる');

    await expect(page.locator('dialog')).toBeVisible();
    await expect(page.locator('text=利用規約')).toBeVisible();

    await page.click('input[name="agree_terms"]');
    await page.click('button:has-text("申請する")');

    await expect(page.locator('text=クリエイター申請が承認されました')).toBeVisible();

    await page.goto('/creation');
    await expect(page.locator('h1')).toContainText('クリエイターダッシュボード');
  });
});
