import { test, expect } from '@playwright/test';

test.describe('Playlist E2E - Full Flow', () => {
  test('should complete full playlist creation and playback flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/(tabs)/settings');
    await page.click('text=マイプレイリスト');
    await page.click('button:has-text("新規プレイリスト作成")');

    await expect(page.locator('dialog')).toBeVisible();
    await page.fill('input[name="name"]', 'E2Eテストプレイリスト');
    await page.fill('textarea[name="description"]', 'テスト用のプレイリストです');
    await page.click('input[name="is_public"]');
    await page.click('button:has-text("作成")');

    await expect(page.locator('text=プレイリストを作成しました')).toBeVisible();
    await expect(page.locator('text=E2Eテストプレイリスト')).toBeVisible();

    await page.goto('/(tabs)/videos');
    await page.click('.video-card:first-child');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=プレイリストに保存')).toBeVisible();
    await page.click('text=E2Eテストプレイリスト');
    await expect(page.locator('text=プレイリストに追加しました')).toBeVisible();
  });
});
