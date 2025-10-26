import { test, expect, Page } from '@playwright/test';

/**
 * Video Management E2E Flow Tests
 *
 * Tests the complete video management workflow:
 * 1. Create video
 * 2. Edit video metadata
 * 3. Add tags
 * 4. Delete video
 *
 * Reference: docs/tests/video-management-tests.md
 */

test.describe('Video Management Complete Flow', () => {
  let page: Page;
  let videoId: string;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Setup: Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await expect(page).toHaveURL('/(tabs)/videos');
  });

  test('should complete full video management workflow', async () => {
    // Step 1: Navigate to upload page
    await page.click('[data-testid="upload-button"]');
    await expect(page).toHaveURL('/creation/upload');

    // Step 2: Upload video file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

    // Step 3: Fill in video metadata
    await page.fill('input[name="title"]', '完全なワークフローテスト動画');
    await page.fill('textarea[name="description"]', 'これはE2Eテストで作成された動画です。');
    await page.selectOption('select[name="category"]', 'education');

    // Step 4: Set privacy to public
    await page.click('[data-testid="privacy-public"]');

    // Step 5: Submit video creation
    await page.click('button:has-text("動画を作成")');

    // Wait for success message
    await expect(page.locator('text=動画を作成しました')).toBeVisible();

    // Capture video ID from URL
    await expect(page).toHaveURL(/\/video\/.+/);
    const url = page.url();
    videoId = url.match(/\/video\/(.+)/)?.[1] || '';
    expect(videoId).toBeTruthy();

    // Step 6: Verify video appears in My Videos
    await page.goto('/creation/');
    await expect(page.locator('text=完全なワークフローテスト動画')).toBeVisible();

    // Step 7: Edit video
    await page.click(`[data-testid="video-${videoId}-menu"]`);
    await page.click('text=編集');
    await expect(page).toHaveURL(`/creation/video/${videoId}/edit`);

    // Step 8: Update title and description
    await page.fill('input[name="title"]', '更新されたテスト動画タイトル');
    await page.fill('textarea[name="description"]', '更新された説明文です。');

    // Step 9: Change category
    await page.selectOption('select[name="category"]', 'technology');

    // Step 10: Save changes
    await page.click('button:has-text("保存")');

    // Wait for success message
    await expect(page.locator('text=動画を更新しました')).toBeVisible();

    // Step 11: Verify updates
    await page.goto(`/video/${videoId}`);
    await expect(page.locator('h1')).toContainText('更新されたテスト動画タイトル');
    await expect(page.locator('[data-testid="video-description"]')).toContainText('更新された説明文です。');
    await expect(page.locator('[data-testid="video-category"]')).toContainText('technology');

    // Step 12: Add tags
    await page.goto(`/creation/video/${videoId}/edit`);
    await page.click('[data-testid="tags-section"]');

    await page.fill('input[name="new-tag"]', 'プログラミング');
    await page.press('input[name="new-tag"]', 'Enter');

    await page.fill('input[name="new-tag"]', 'TypeScript');
    await page.press('input[name="new-tag"]', 'Enter');

    await page.fill('input[name="new-tag"]', 'チュートリアル');
    await page.press('input[name="new-tag"]', 'Enter');

    // Wait for tags to be added
    await expect(page.locator('[data-testid="tag-プログラミング"]')).toBeVisible();
    await expect(page.locator('[data-testid="tag-TypeScript"]')).toBeVisible();
    await expect(page.locator('[data-testid="tag-チュートリアル"]')).toBeVisible();

    // Step 13: Save tags
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=タグを更新しました')).toBeVisible();

    // Step 14: Verify tags on video page
    await page.goto(`/video/${videoId}`);
    await expect(page.locator('[data-testid="video-tags"]')).toContainText('プログラミング');
    await expect(page.locator('[data-testid="video-tags"]')).toContainText('TypeScript');
    await expect(page.locator('[data-testid="video-tags"]')).toContainText('チュートリアル');

    // Step 15: Delete video
    await page.goto('/creation/');
    await page.click(`[data-testid="video-${videoId}-menu"]`);
    await page.click('text=削除');

    // Step 16: Confirm deletion
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
    await page.click('button:has-text("削除する")');

    // Wait for success message
    await expect(page.locator('text=動画を削除しました')).toBeVisible();

    // Step 17: Verify video is removed from list
    await expect(page.locator('text=更新されたテスト動画タイトル')).not.toBeVisible();

    // Step 18: Verify video cannot be accessed
    await page.goto(`/video/${videoId}`);
    await expect(page.locator('text=動画が見つかりません')).toBeVisible();
  });

  test('should create video with minimal information', async () => {
    // Navigate to upload
    await page.click('[data-testid="upload-button"]');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

    // Fill only required fields
    await page.fill('input[name="title"]', 'ミニマルテスト動画');

    // Submit
    await page.click('button:has-text("動画を作成")');

    // Verify success
    await expect(page.locator('text=動画を作成しました')).toBeVisible();
    await expect(page).toHaveURL(/\/video\/.+/);
  });

  test('should validate required fields on create', async () => {
    // Navigate to upload
    await page.click('[data-testid="upload-button"]');

    // Try to submit without file
    await page.fill('input[name="title"]', 'タイトルのみ');
    await page.click('button:has-text("動画を作成")');

    // Should show error
    await expect(page.locator('text=動画ファイルを選択してください')).toBeVisible();
  });

  test('should validate title length on create', async () => {
    await page.click('[data-testid="upload-button"]');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

    // Try very long title
    const longTitle = 'あ'.repeat(201);
    await page.fill('input[name="title"]', longTitle);
    await page.click('button:has-text("動画を作成")');

    // Should show error
    await expect(page.locator('text=タイトルは200文字以内')).toBeVisible();
  });

  test('should update video privacy setting', async () => {
    // Create video first
    await page.click('[data-testid="upload-button"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

    await page.fill('input[name="title"]', 'プライバシーテスト動画');
    await page.click('[data-testid="privacy-public"]');
    await page.click('button:has-text("動画を作成")');

    await expect(page.locator('text=動画を作成しました')).toBeVisible();
    const url = page.url();
    videoId = url.match(/\/video\/(.+)/)?.[1] || '';

    // Edit video
    await page.goto(`/creation/video/${videoId}/edit`);

    // Change to private
    await page.click('[data-testid="privacy-private"]');
    await page.click('button:has-text("保存")');

    await expect(page.locator('text=動画を更新しました')).toBeVisible();

    // Verify privacy badge
    await page.goto(`/video/${videoId}`);
    await expect(page.locator('[data-testid="privacy-badge"]')).toContainText('非公開');
  });

  test('should prevent editing another user\'s video', async () => {
    // This test would require setting up another user
    // For now, we test the URL protection

    // Try to access edit page for non-existent video
    await page.goto('/creation/video/vid_nonexistent/edit');

    // Should show error or redirect
    await expect(page.locator('text=動画が見つかりません')).toBeVisible();
  });

  test('should show processing status for new videos', async () => {
    await page.click('[data-testid="upload-button"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

    await page.fill('input[name="title"]', '処理中ステータステスト');
    await page.click('button:has-text("動画を作成")');

    await expect(page.locator('text=動画を作成しました')).toBeVisible();

    // Go to My Videos
    await page.goto('/creation/');

    // Should show processing badge
    await expect(page.locator('[data-testid="status-processing"]')).toBeVisible();
  });

  test('should handle upload cancellation', async () => {
    await page.click('[data-testid="upload-button"]');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/large-video.mp4');

    // Wait for upload to start
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Cancel upload
    await page.click('[data-testid="cancel-upload"]');

    // Confirm cancellation
    await expect(page.locator('[data-testid="upload-cancelled"]')).toBeVisible();
  });

  test('should show tag count limit', async () => {
    // Create video
    await page.click('[data-testid="upload-button"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

    await page.fill('input[name="title"]', 'タグ上限テスト');
    await page.click('button:has-text("動画を作成")');

    const url = page.url();
    videoId = url.match(/\/video\/(.+)/)?.[1] || '';

    // Go to edit
    await page.goto(`/creation/video/${videoId}/edit`);
    await page.click('[data-testid="tags-section"]');

    // Add 10 tags
    for (let i = 1; i <= 10; i++) {
      await page.fill('input[name="new-tag"]', `タグ${i}`);
      await page.press('input[name="new-tag"]', 'Enter');
    }

    // Try to add 11th tag
    await page.fill('input[name="new-tag"]', 'タグ11');
    await page.press('input[name="new-tag"]', 'Enter');

    // Should show error
    await expect(page.locator('text=タグは最大10個まで')).toBeVisible();
  });

  test('should remove tags', async () => {
    // Create video with tags
    await page.click('[data-testid="upload-button"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

    await page.fill('input[name="title"]', 'タグ削除テスト');
    await page.click('button:has-text("動画を作成")');

    const url = page.url();
    videoId = url.match(/\/video\/(.+)/)?.[1] || '';

    // Add tags
    await page.goto(`/creation/video/${videoId}/edit`);
    await page.click('[data-testid="tags-section"]');

    await page.fill('input[name="new-tag"]', '削除するタグ');
    await page.press('input[name="new-tag"]', 'Enter');
    await page.click('button:has-text("保存")');

    // Remove tag
    await page.click('[data-testid="tags-section"]');
    await page.click('[data-testid="remove-tag-削除するタグ"]');
    await page.click('button:has-text("保存")');

    // Verify tag removed
    await page.goto(`/video/${videoId}`);
    await expect(page.locator('[data-testid="video-tags"]')).not.toContainText('削除するタグ');
  });

  test('should show thumbnail preview on upload', async () => {
    await page.click('[data-testid="upload-button"]');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample-video.mp4');

    // Should show video preview
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();

    // Should show generated thumbnails
    await expect(page.locator('[data-testid="thumbnail-options"]')).toBeVisible({ timeout: 10000 });

    // Should be able to select thumbnail
    await page.click('[data-testid="thumbnail-option-0"]');
    await expect(page.locator('[data-testid="selected-thumbnail"]')).toBeVisible();
  });

  test('should sort My Videos by different criteria', async () => {
    await page.goto('/creation/');

    // Sort by newest
    await page.selectOption('[data-testid="sort-select"]', 'newest');
    await page.waitForTimeout(500);

    // Sort by oldest
    await page.selectOption('[data-testid="sort-select"]', 'oldest');
    await page.waitForTimeout(500);

    // Sort by views
    await page.selectOption('[data-testid="sort-select"]', 'views');
    await page.waitForTimeout(500);

    // Sort by title
    await page.selectOption('[data-testid="sort-select"]', 'title');
    await page.waitForTimeout(500);
  });

  test('should filter My Videos by status', async () => {
    await page.goto('/creation/');

    // Filter by processing
    await page.click('[data-testid="filter-processing"]');
    await page.waitForTimeout(500);

    // Filter by completed
    await page.click('[data-testid="filter-completed"]');
    await page.waitForTimeout(500);

    // Filter by failed
    await page.click('[data-testid="filter-failed"]');
    await page.waitForTimeout(500);

    // Show all
    await page.click('[data-testid="filter-all"]');
    await page.waitForTimeout(500);
  });

  test('should search My Videos', async () => {
    await page.goto('/creation/');

    // Search for video
    await page.fill('[data-testid="search-input"]', 'テスト');
    await page.waitForTimeout(500);

    // Should show filtered results
    await expect(page.locator('[data-testid="video-list"]')).toBeVisible();
  });

  test.afterEach(async () => {
    // Cleanup: Delete test video if it exists
    if (videoId) {
      try {
        await page.goto('/creation/');
        await page.click(`[data-testid="video-${videoId}-menu"]`);
        await page.click('text=削除');
        await page.click('button:has-text("削除する")');
      } catch (error) {
        // Video already deleted or doesn't exist
      }
    }
  });
});
