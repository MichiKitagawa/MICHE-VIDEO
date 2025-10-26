import { test, expect } from '@playwright/test';

/**
 * Live Streaming E2E Flow Tests
 *
 * Tests complete user flows for live streaming
 * Reference: docs/tests/live-streaming-tests.md
 */

test.describe('Live Streaming E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
  });

  test('should complete full live streaming flow', async ({ page }) => {
    // Navigate to live creation page
    await page.goto('/go-live');
    await expect(page).toHaveURL('/go-live');

    // Fill in live stream info
    await page.fill('input[name="title"]', 'E2Eテストライブ配信');
    await page.fill('textarea[name="description"]', 'テスト用の配信です');
    await page.selectOption('select[name="category"]', 'gaming');

    // Create stream
    await page.click('button:has-text("配信を作成")');

    // Verify stream key displayed
    await expect(page.locator('text=ストリームキー')).toBeVisible();
    await expect(page.locator('text=RTMP URL')).toBeVisible();

    // Start stream (simulated)
    await page.click('button:has-text("配信を開始")');
    await expect(page.locator('text=配信中')).toBeVisible();
  });

  test('should interact with live chat', async ({ page }) => {
    await page.goto('/live/live_123456');

    // Verify chat container
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();

    // Send chat message
    await page.fill('textarea[placeholder="メッセージを入力"]', 'こんにちは!');
    await page.click('button:has-text("送信")');

    // Verify message appears
    await expect(page.locator('text=こんにちは!')).toBeVisible();
  });

  test('should send superchat', async ({ page }) => {
    await page.goto('/live/live_123456');

    // Open superchat dialog
    await page.click('button:has-text("スーパーチャット")');

    // Fill in amount and message
    await page.fill('input[name="amount"]', '1000');
    await page.fill('textarea[name="message"]', '応援しています!');

    // Confirm payment
    await page.click('button:has-text("送信")');

    // Verify success (would integrate with payment provider in real implementation)
    await expect(page.locator('text=スーパーチャットを送信しました')).toBeVisible();
  });

  test('should display viewer count', async ({ page }) => {
    await page.goto('/live/live_123456');

    // Verify viewer count element
    await expect(page.locator('[data-testid="viewer-count"]')).toBeVisible();

    const viewerCount = await page.locator('[data-testid="viewer-count"]').textContent();
    expect(viewerCount).toMatch(/\d+/);
  });

  test('should show live stream statistics for creator', async ({ page }) => {
    await page.goto('/creation/');

    // Verify stats elements
    await expect(page.locator('[data-testid="current-viewers"]')).toBeVisible();
    await expect(page.locator('[data-testid="peak-viewers"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-superchat"]')).toBeVisible();
    await expect(page.locator('[data-testid="viewer-timeline"]')).toBeVisible();
  });

  test('should end live stream with confirmation', async ({ page }) => {
    await page.goto('/go-live');

    // Click end stream button
    await page.click('button:has-text("配信を終了")');

    // Confirm
    await expect(page.locator('text=配信を終了しますか')).toBeVisible();
    await page.click('button:has-text("終了する")');

    // Verify ended
    await expect(page.locator('text=配信を終了しました')).toBeVisible();
  });

  test('should display active live streams', async ({ page }) => {
    await page.goto('/(tabs)/videos');
    await page.click('text=ライブ');

    // Verify live stream cards
    await expect(page.locator('[data-testid="live-stream-card"]')).toHaveCount(1, {
      timeout: 5000
    });

    // Verify live indicator
    await expect(page.locator('[data-live-indicator]')).toBeVisible();
  });

  test('should filter live streams by category', async ({ page }) => {
    await page.goto('/(tabs)/videos');
    await page.click('text=ライブ');

    // Apply category filter
    await page.selectOption('select[name="category"]', 'gaming');

    // Verify filtered results
    const categoryBadges = await page.locator('[data-category]').allTextContents();
    categoryBadges.forEach(badge => {
      expect(badge.toLowerCase()).toContain('ゲーム');
    });
  });
});
