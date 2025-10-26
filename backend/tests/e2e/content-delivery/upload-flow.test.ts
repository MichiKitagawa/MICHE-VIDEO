import { test, expect } from '@playwright/test';

test.describe('Content Delivery E2E - Complete Upload Flow', () => {
  test('should complete full upload to CDN flow for video', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Navigate to upload page
    await page.goto('/upload');
    await expect(page.locator('h1')).toContainText('動画をアップロード');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('mock video content')
    });

    // Verify file selected
    await expect(page.locator('.file-selected')).toBeVisible();
    await expect(page.locator('.file-name')).toContainText('test-video.mp4');

    // Fill video details
    await page.fill('input[name="title"]', 'テスト動画タイトル');
    await page.fill('textarea[name="description"]', 'これはテスト動画の説明です');
    await page.selectOption('select[name="category"]', 'education');
    await page.selectOption('select[name="privacy"]', 'public');

    // Add tags
    await page.fill('input[name="tags"]', 'プログラミング');
    await page.press('input[name="tags"]', 'Enter');
    await expect(page.locator('.tag')).toContainText('プログラミング');

    // Start upload
    await page.click('button:has-text("アップロード開始")');

    // Verify upload initiation
    await expect(page.locator('.upload-progress')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();

    // Wait for upload to complete (mock scenario completes quickly)
    await expect(page.locator('.upload-status')).toContainText('アップロード完了', {
      timeout: 30000
    });

    // Verify transcode started
    await expect(page.locator('.transcode-status')).toBeVisible();
    await expect(page.locator('.transcode-message')).toContainText('トランスコード中');

    // Navigate to video management
    await page.goto('/(tabs)/creation');
    await page.click('text=動画');

    // Verify uploaded video appears in list
    await expect(page.locator('.video-item')).toContainText('テスト動画タイトル');

    // Check transcode status
    await page.click('.video-item:has-text("テスト動画タイトル")');
    await expect(page.locator('.video-status')).toBeVisible();

    // If transcode completed (mock scenario)
    if (await page.locator('.video-status:has-text("完了")').isVisible()) {
      // Verify CDN URL available
      await page.click('button:has-text("プレビュー")');
      await expect(page.locator('video')).toBeVisible();
      await expect(page.locator('video')).toHaveAttribute('src', /.+cloudfront\.net.+/);
    }
  });

  test('should complete full upload to CDN flow for short', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Navigate to short upload
    await page.goto('/upload/short');
    await expect(page.locator('h1')).toContainText('ショートをアップロード');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-short.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('mock short video')
    });

    // Fill short details
    await page.fill('input[name="title"]', 'テストショート');
    await page.fill('textarea[name="description"]', 'ショートの説明');

    // Start upload
    await page.click('button:has-text("アップロード")');

    // Wait for completion
    await expect(page.locator('.upload-status')).toContainText('完了', {
      timeout: 30000
    });

    // Verify in short list
    await page.goto('/(tabs)/creation');
    await page.click('text=ショート');
    await expect(page.locator('.short-item')).toContainText('テストショート');
  });

  test('should handle upload error gracefully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/upload');

    // Try to upload invalid file type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content')
    });

    // Verify error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('動画ファイルを選択してください');

    // Upload button should be disabled
    await expect(page.locator('button:has-text("アップロード開始")')).toBeDisabled();
  });

  test('should handle large file upload with progress updates', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(500 * 1024 * 1024) // 500MB mock
    });

    await page.fill('input[name="title"]', '大容量動画');
    await page.click('button:has-text("アップロード開始")');

    // Verify progress bar updates
    await expect(page.locator('.progress-bar')).toBeVisible();

    // Progress percentage should be visible
    await expect(page.locator('.progress-percent')).toBeVisible();

    // Upload speed should be shown
    await expect(page.locator('.upload-speed')).toBeVisible();

    // Time remaining should be shown
    await expect(page.locator('.time-remaining')).toBeVisible();

    // Allow pause/cancel
    await expect(page.locator('button:has-text("一時停止")')).toBeVisible();
    await expect(page.locator('button:has-text("キャンセル")')).toBeVisible();
  });

  test('should allow pause and resume upload', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(200 * 1024 * 1024)
    });

    await page.fill('input[name="title"]', 'テスト動画');
    await page.click('button:has-text("アップロード開始")');

    // Wait a bit
    await page.waitForTimeout(2000);

    // Pause upload
    await page.click('button:has-text("一時停止")');
    await expect(page.locator('.upload-status')).toContainText('一時停止中');

    // Resume upload
    await page.click('button:has-text("再開")');
    await expect(page.locator('.upload-status')).toContainText('アップロード中');

    // Wait for completion
    await expect(page.locator('.upload-status')).toContainText('完了', {
      timeout: 30000
    });
  });

  test('should display transcode progress', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('mock video')
    });

    await page.fill('input[name="title"]', 'トランスコードテスト');
    await page.click('button:has-text("アップロード開始")');

    // Wait for upload completion
    await expect(page.locator('.upload-status')).toContainText('完了', {
      timeout: 15000
    });

    // Transcode section should appear
    await expect(page.locator('.transcode-section')).toBeVisible();

    // Quality variants being processed
    await expect(page.locator('.quality-1080p')).toBeVisible();
    await expect(page.locator('.quality-720p')).toBeVisible();
    await expect(page.locator('.quality-480p')).toBeVisible();

    // Each quality should show progress
    for (const quality of ['1080p', '720p', '480p']) {
      const qualityElement = page.locator(`.quality-${quality}`);
      await expect(qualityElement.locator('.status')).toBeVisible();
    }
  });

  test('should validate file size limits', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'free@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/upload');

    // Try to upload file exceeding 5GB
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'huge-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(6 * 1024 * 1024 * 1024) // 6GB mock
    });

    // Error should be shown
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('5GB');
    await expect(page.locator('button:has-text("アップロード開始")')).toBeDisabled();
  });

  test('should show storage quota warning', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'free@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/upload');

    // Check storage quota display
    await expect(page.locator('.storage-quota')).toBeVisible();
    await expect(page.locator('.storage-used')).toBeVisible();
    await expect(page.locator('.storage-total')).toBeVisible();

    // Progress bar for storage
    await expect(page.locator('.storage-progress-bar')).toBeVisible();

    // If near limit, warning should appear
    const storagePercent = await page.locator('.storage-percent').textContent();
    if (parseInt(storagePercent || '0') > 80) {
      await expect(page.locator('.storage-warning')).toBeVisible();
    }
  });

  test('should allow retry on failed upload', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('mock video')
    });

    await page.fill('input[name="title"]', 'リトライテスト');

    // Simulate network failure
    await page.route('**/api/upload/**', route => route.abort());

    await page.click('button:has-text("アップロード開始")');

    // Error should be shown
    await expect(page.locator('.upload-error')).toBeVisible();
    await expect(page.locator('button:has-text("再試行")')).toBeVisible();

    // Clear route override
    await page.unroute('**/api/upload/**');

    // Retry
    await page.click('button:has-text("再試行")');

    // Should succeed
    await expect(page.locator('.upload-status')).toContainText('完了', {
      timeout: 30000
    });
  });
});
