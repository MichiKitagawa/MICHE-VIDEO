import { test, expect } from '@playwright/test';

test.describe('Channel Management E2E - Settings Flow', () => {
  test('should update channel settings and view analytics', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/creation');
    await page.click('text=設定');

    await page.fill('input[name="channel_name"]', '田中太郎のプログラミングチャンネル');
    await page.fill('textarea[name="description"]', '初心者向けのプログラミング講座を配信しています');

    await page.click('button:has-text("追加")');
    await page.selectOption('select[name="platform"]', 'twitter');
    await page.fill('input[name="url"]', 'https://twitter.com/tanaka');
    await page.click('button:has-text("保存")');

    await expect(page.locator('text=チャンネル情報を更新しました')).toBeVisible();

    await page.click('text=アナリティクス');

    await expect(page.locator('.analytics-overview')).toBeVisible();
    await expect(page.locator('text=総視聴回数')).toBeVisible();
    await expect(page.locator('text=総視聴時間')).toBeVisible();
    await expect(page.locator('text=新規フォロワー')).toBeVisible();

    await page.click('button:has-text("7日間")');
    await expect(page.locator('.chart')).toBeVisible();
  });
});
