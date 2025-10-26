/**
 * User Registration E2E Flow Tests
 *
 * Complete user journey from registration to login
 * Reference: docs/tests/authentication-tests.md (TC-201)
 */

import { test, expect } from '@playwright/test';

test.describe('User Registration and Login Flow', () => {
  const testEmail = `e2e-${Date.now()}@example.com`;
  const testPassword = 'E2ETest123!';
  const testName = 'E2E Test User';

  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage
    await page.context().clearCookies();
  });

  test('should complete full registration and login flow', async ({ page }) => {
    // 1. Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/登録|Register/);

    // 2. Fill in registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);

    // 3. Submit registration
    await page.click('button[type="submit"]');

    // 4. Should redirect to dashboard/videos page
    await expect(page).toHaveURL(/(tabs\/videos|dashboard)/);

    // 5. Verify user is logged in
    await expect(page.locator(`text=${testName}`)).toBeVisible({ timeout: 5000 });

    // 6. Check for email verification banner
    const verificationBanner = page.locator('text=/メールアドレスを確認|verify.*email/i');
    await expect(verificationBanner).toBeVisible();

    // 7. Navigate to settings
    await page.click('[aria-label="Settings"], [data-testid="settings-button"]');

    // 8. Verify user info in settings
    const userEmail = page.locator(`text=${testEmail}`);
    await expect(userEmail).toBeVisible();

    // 9. Logout
    await page.click('text=/ログアウト|logout/i');

    // 10. Should redirect to login page
    await expect(page).toHaveURL(/login/);

    // 11. Login with credentials
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // 12. Should be back at dashboard
    await expect(page).toHaveURL(/(tabs\/videos|dashboard)/);
    await expect(page.locator(`text=${testName}`)).toBeVisible();
  });

  test('should handle registration with existing email', async ({ page }) => {
    // First registration
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);
    await page.click('button[type="submit"]');

    // Wait for success
    await expect(page).toHaveURL(/(tabs\/videos|dashboard)/);

    // Logout
    await page.click('[aria-label="Settings"]');
    await page.click('text=/ログアウト|logout/i');

    // Try to register again with same email
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'DifferentPass123!');
    await page.fill('input[name="name"]', 'Different Name');
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.locator('text=/既に使用|already exists/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'weak'); // Weak password
    await page.fill('input[name="name"]', testName);

    await page.click('button[type="submit"]');

    // Should show password validation errors
    const errorMessage = page.locator('text=/パスワード|password.*要件|requirements/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should persist login across page reloads', async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/(tabs\/videos|dashboard)/);

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page).toHaveURL(/(tabs\/videos|dashboard)/);
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Email Verification Flow', () => {
  const testEmail = `verify-${Date.now()}@example.com`;
  const testPassword = 'Verify123!';

  test('should display unverified email banner', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', 'Verify User');
    await page.click('button[type="submit"]');

    // Should show verification banner
    const banner = page.locator('text=/メールアドレスを確認|verify.*email/i');
    await expect(banner).toBeVisible();
  });

  test('should allow resending verification email', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', 'Verify User');
    await page.click('button[type="submit"]');

    // Click resend button
    const resendButton = page.locator('text=/再送信|resend/i');
    await resendButton.click();

    // Should show success message
    const successMessage = page.locator('text=/送信しました|sent/i');
    await expect(successMessage).toBeVisible();
  });

  // Note: Actual email verification would require email testing infrastructure
  // This would typically be tested in integration tests or with email testing services
});

test.describe('Session Management', () => {
  const testEmail = `session-${Date.now()}@example.com`;
  const testPassword = 'Session123!';

  test('should handle concurrent sessions', async ({ browser }) => {
    // Create two contexts (simulating two browsers)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Register in first context
    await page1.goto('/register');
    await page1.fill('input[name="email"]', testEmail);
    await page1.fill('input[name="password"]', testPassword);
    await page1.fill('input[name="name"]', 'Session User');
    await page1.click('button[type="submit"]');

    await expect(page1).toHaveURL(/(tabs\/videos|dashboard)/);

    // Login in second context
    await page2.goto('/login');
    await page2.fill('input[name="email"]', testEmail);
    await page2.fill('input[name="password"]', testPassword);
    await page2.click('button[type="submit"]');

    await expect(page2).toHaveURL(/(tabs\/videos|dashboard)/);

    // Both should be logged in
    await expect(page1.locator('text=Session User')).toBeVisible();
    await expect(page2.locator('text=Session User')).toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('should logout from single session', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Register
    await page1.goto('/register');
    await page1.fill('input[name="email"]', testEmail);
    await page1.fill('input[name="password"]', testPassword);
    await page1.fill('input[name="name"]', 'Session User');
    await page1.click('button[type="submit"]');

    // Login in second context
    await page2.goto('/login');
    await page2.fill('input[name="email"]', testEmail);
    await page2.fill('input[name="password"]', testPassword);
    await page2.click('button[type="submit"]');

    // Logout from first context
    await page1.click('[aria-label="Settings"]');
    await page1.click('text=/ログアウト|logout/i');

    await expect(page1).toHaveURL(/login/);

    // Second context should still be logged in
    await page2.reload();
    await expect(page2.locator('text=Session User')).toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
  });
});
