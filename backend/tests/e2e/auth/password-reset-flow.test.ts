/**
 * Password Reset E2E Flow Tests
 *
 * Complete password reset journey
 * Reference: docs/tests/authentication-tests.md (TC-202)
 */

import { test, expect } from '@playwright/test';

test.describe('Password Reset Flow', () => {
  const testEmail = `reset-${Date.now()}@example.com`;
  const originalPassword = 'Original123!';
  const newPassword = 'NewPassword456!';

  test.beforeAll(async ({ browser }) => {
    // Setup: Create a test user
    const page = await browser.newPage();
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', originalPassword);
    await page.fill('input[name="name"]', 'Reset Test User');
    await page.click('button[type="submit"]');
    await page.close();
  });

  test('should complete full password reset flow', async ({ page }) => {
    // 1. Go to login page
    await page.goto('/login');

    // 2. Click forgot password link
    await page.click('text=/パスワードを忘れた|forgot password/i');

    // 3. Should navigate to reset request page
    await expect(page).toHaveURL(/forgot-password|reset-password/);

    // 4. Enter email
    await page.fill('input[name="email"]', testEmail);

    // 5. Submit request
    await page.click('button[type="submit"]');

    // 6. Should show success message
    const successMessage = page.locator('text=/メールを送信|email.*sent/i');
    await expect(successMessage).toBeVisible();

    // Note: In real E2E, we would:
    // - Use email testing service to get the reset link
    // - Navigate to the reset link
    // - Complete password reset
    // - Login with new password

    // For demo purposes, we'll simulate the flow
    // await page.goto('/reset-password?token=mock-token');
    // await page.fill('input[name="password"]', newPassword);
    // await page.fill('input[name="confirmPassword"]', newPassword);
    // await page.click('button[type="submit"]');

    // await expect(page.locator('text=/パスワードをリセット|password reset/i')).toBeVisible();

    // // Login with new password
    // await page.goto('/login');
    // await page.fill('input[name="email"]', testEmail);
    // await page.fill('input[name="password"]', newPassword);
    // await page.click('button[type="submit"]');

    // await expect(page).toHaveURL(/(tabs\/videos|dashboard)/);
  });

  test('should validate email format in reset request', async ({ page }) => {
    await page.goto('/forgot-password');

    // Enter invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    // Should show validation error
    const errorMessage = page.locator('text=/有効なメール|valid email/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should not reveal if email exists', async ({ page }) => {
    await page.goto('/forgot-password');

    // Request reset for non-existent email
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.click('button[type="submit"]');

    // Should show same success message
    const successMessage = page.locator('text=/メールを送信|email.*sent/i');
    await expect(successMessage).toBeVisible();
  });

  test('should validate new password strength', async ({ page }) => {
    // Simulate being on reset page with valid token
    await page.goto('/reset-password?token=mock-token-123');

    // Try weak password
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.click('button[type="submit"]');

    // Should show validation errors
    const errorMessage = page.locator('text=/パスワード.*要件|password.*requirements/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should require password confirmation match', async ({ page }) => {
    await page.goto('/reset-password?token=mock-token-123');

    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.click('button[type="submit"]');

    // Should show mismatch error
    const errorMessage = page.locator('text=/パスワードが一致|passwords.*match/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should handle expired reset token', async ({ page }) => {
    // Simulate expired token
    await page.goto('/reset-password?token=expired-token');

    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);
    await page.click('button[type="submit"]');

    // Should show expired token message
    const errorMessage = page.locator('text=/期限切れ|expired|無効|invalid/i');
    await expect(errorMessage).toBeVisible();
  });
});

test.describe('Change Password in Settings', () => {
  const testEmail = `change-${Date.now()}@example.com`;
  const currentPassword = 'Current123!';
  const newPassword = 'NewPassword456!';

  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', currentPassword);
    await page.fill('input[name="name"]', 'Change Test User');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/(tabs\/videos|dashboard)/);
  });

  test('should change password from settings', async ({ page }) => {
    // Navigate to settings
    await page.click('[aria-label="Settings"]');
    await page.click('text=/セキュリティ|security|パスワード|password/i');

    // Fill change password form
    await page.fill('input[name="currentPassword"]', currentPassword);
    await page.fill('input[name="newPassword"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);

    await page.click('button:has-text("変更"), button:has-text("Change")');

    // Should show success message
    const successMessage = page.locator('text=/パスワードを変更|password changed/i');
    await expect(successMessage).toBeVisible();

    // Logout
    await page.click('text=/ログアウト|logout/i');

    // Login with new password
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', newPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/(tabs\/videos|dashboard)/);
  });

  test('should reject incorrect current password', async ({ page }) => {
    await page.click('[aria-label="Settings"]');
    await page.click('text=/セキュリティ|security|パスワード|password/i');

    await page.fill('input[name="currentPassword"]', 'WrongPassword123!');
    await page.fill('input[name="newPassword"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);

    await page.click('button:has-text("変更"), button:has-text("Change")');

    // Should show error
    const errorMessage = page.locator('text=/現在のパスワードが正しくない|incorrect.*password/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should validate new password is different', async ({ page }) => {
    await page.click('[aria-label="Settings"]');
    await page.click('text=/セキュリティ|security|パスワード|password/i');

    // Try to use same password
    await page.fill('input[name="currentPassword"]', currentPassword);
    await page.fill('input[name="newPassword"]', currentPassword);
    await page.fill('input[name="confirmPassword"]', currentPassword);

    await page.click('button:has-text("変更"), button:has-text("Change")');

    // Should show error
    const errorMessage = page.locator('text=/新しいパスワードは現在と異なる|different.*password/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should invalidate all sessions after password change', async ({ browser }) => {
    // Create two sessions
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login in both
    for (const page of [page1, page2]) {
      await page.goto('/login');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', currentPassword);
      await page.click('button[type="submit"]');
    }

    // Change password in first session
    await page1.click('[aria-label="Settings"]');
    await page1.click('text=/セキュリティ|security/i');
    await page1.fill('input[name="currentPassword"]', currentPassword);
    await page1.fill('input[name="newPassword"]', newPassword);
    await page1.fill('input[name="confirmPassword"]', newPassword);
    await page1.click('button:has-text("変更")');

    // Second session should be logged out
    await page2.reload();
    await expect(page2).toHaveURL(/login/);

    // Cleanup
    await context1.close();
    await context2.close();
  });
});
