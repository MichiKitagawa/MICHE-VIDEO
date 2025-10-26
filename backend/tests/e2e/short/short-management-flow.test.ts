import { test, expect } from '@playwright/test';

/**
 * Short Management E2E Flow Tests
 *
 * Tests complete user flows for short video management:
 * - Create and publish short
 * - Edit short metadata
 * - Delete short with confirmation
 *
 * Reference: docs/tests/short-management-tests.md
 */

test.describe('Short Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should create and publish short successfully', async ({ page }) => {
    // Navigate to creation page
    await page.goto('/creation');
    await expect(page).toHaveURL('/creation');

    // Click short upload button
    await page.click('text=ショート動画をアップロード');

    // Fill in short metadata
    await page.fill('input[name="title"]', '素晴らしいダンス動画');
    await page.fill('textarea[name="description"]', '踊ってみました！');
    await page.selectOption('select[name="category"]', 'dance');
    await page.fill('input[name="tags"]', 'ダンス,踊ってみた,TikTok');
    await page.click('input[value="public"]');

    // Upload video file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/short-video-30s.mp4');

    // Submit upload
    await page.click('button:has-text("アップロード")');

    // Verify processing status
    await expect(page.locator('text=処理中')).toBeVisible();

    // Wait for publish (with timeout)
    await expect(page.locator('text=公開済み')).toBeVisible({ timeout: 60000 });

    // Navigate to my shorts and verify it appears
    await page.goto('/creation');
    await page.click('text=Shorts');
    await expect(page.locator('text=素晴らしいダンス動画')).toBeVisible();
  });

  test('should edit short metadata', async ({ page }) => {
    // Navigate to my shorts
    await page.goto('/creation');
    await page.click('text=Shorts');

    // Click edit on first short
    await page.click('[data-testid="short-item"]:first-child button:has-text("編集")');

    // Edit fields
    await page.fill('input[name="title"]', '更新されたタイトル');
    await page.selectOption('select[name="category"]', 'comedy');
    await page.fill('input[name="tags"]', '新しいタグ,更新');

    // Save changes
    await page.click('button:has-text("保存")');

    // Verify success message
    await expect(page.locator('text=更新しました')).toBeVisible();

    // Verify changes persisted
    await page.goto('/creation');
    await page.click('text=Shorts');
    await expect(page.locator('text=更新されたタイトル')).toBeVisible();
  });

  test('should delete short with confirmation', async ({ page }) => {
    // Navigate to my shorts
    await page.goto('/creation');
    await page.click('text=Shorts');

    // Get title of first short for verification
    const shortTitle = await page.locator('[data-testid="short-item"]:first-child h3').textContent();

    // Click delete button
    await page.click('[data-testid="short-item"]:first-child button:has-text("削除")');

    // Verify confirmation dialog
    await expect(page.locator('text=本当に削除しますか')).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("削除する")');

    // Verify success message
    await expect(page.locator('text=削除しました')).toBeVisible();

    // Verify short no longer appears
    await expect(page.locator(`text=${shortTitle}`)).not.toBeVisible();
  });

  test('should handle upload validation errors', async ({ page }) => {
    await page.goto('/creation');
    await page.click('text=ショート動画をアップロード');

    // Try to submit without required fields
    await page.click('button:has-text("アップロード")');

    // Verify error messages
    await expect(page.locator('text=タイトルは必須です')).toBeVisible();
    await expect(page.locator('text=動画ファイルを選択してください')).toBeVisible();
  });

  test('should preview short before publishing', async ({ page }) => {
    await page.goto('/creation');
    await page.click('text=ショート動画をアップロード');

    await page.fill('input[name="title"]', 'プレビューテスト');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/short-video-15s.mp4');

    // Click preview button
    await page.click('button:has-text("プレビュー")');

    // Verify preview player appears
    await expect(page.locator('[data-testid="preview-player"]')).toBeVisible();

    // Verify video plays
    const video = page.locator('video');
    await expect(video).toBeVisible();
  });

  test('should bulk delete multiple shorts', async ({ page }) => {
    await page.goto('/creation');
    await page.click('text=Shorts');

    // Select multiple shorts
    await page.click('[data-testid="short-item"]:nth-child(1) input[type="checkbox"]');
    await page.click('[data-testid="short-item"]:nth-child(2) input[type="checkbox"]');

    // Click bulk delete
    await page.click('button:has-text("選択した項目を削除")');

    // Confirm
    await expect(page.locator('text=2件のショートを削除しますか')).toBeVisible();
    await page.click('button:has-text("削除する")');

    // Verify success
    await expect(page.locator('text=2件削除しました')).toBeVisible();
  });

  test('should change privacy setting', async ({ page }) => {
    await page.goto('/creation');
    await page.click('text=Shorts');

    // Click on first short
    await page.click('[data-testid="short-item"]:first-child');

    // Open privacy dropdown
    await page.click('select[name="privacy"]');
    await page.selectOption('select[name="privacy"]', 'private');

    // Verify change saved
    await expect(page.locator('text=プライバシー設定を更新しました')).toBeVisible();
  });

  test('should filter shorts by category', async ({ page }) => {
    await page.goto('/creation');
    await page.click('text=Shorts');

    // Apply category filter
    await page.selectOption('select[name="category-filter"]', 'dance');

    // Verify only dance shorts shown
    const categoryBadges = await page.locator('[data-category]').allTextContents();
    categoryBadges.forEach(badge => {
      expect(badge.toLowerCase()).toContain('ダンス');
    });
  });

  test('should sort shorts by view count', async ({ page }) => {
    await page.goto('/creation');
    await page.click('text=Shorts');

    // Select sort option
    await page.selectOption('select[name="sort"]', 'view_count');

    // Verify shorts are sorted
    const viewCounts = await page.locator('[data-testid="view-count"]').allTextContents();
    const numbers = viewCounts.map(v => parseInt(v.replace(/[^0-9]/g, '')));

    for (let i = 0; i < numbers.length - 1; i++) {
      expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i + 1]);
    }
  });

  test('should handle video upload progress', async ({ page }) => {
    await page.goto('/creation');
    await page.click('text=ショート動画をアップロード');

    await page.fill('input[name="title"]', 'アップロードテスト');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/large-short-video.mp4');

    await page.click('button:has-text("アップロード")');

    // Verify progress bar appears
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Verify percentage updates
    await expect(page.locator('text=%')).toBeVisible();
  });
});
