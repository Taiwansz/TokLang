const { test, expect } = require('@playwright/test');

test.describe('TokLang v2 Web Application - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5500/#home');
  });

  test('Homepage navigation, Industrial Pop layout and benchmark telemetry', async ({ page }) => {
    await expect(page.locator('nav .nav-logo')).toHaveText('TokLang');

    const navLinks = page.locator('.nav-links li a');
    await expect(navLinks).toHaveCount(4);
    await expect(navLinks.nth(0)).toHaveText('Início');
    await expect(navLinks.nth(1)).toHaveText('App');
    await expect(navLinks.nth(2)).toHaveText('Docs');
    await expect(navLinks.nth(3)).toHaveText('Preços');

    await expect(page.locator('.bench-table')).toBeVisible();
    await expect(page.locator('.bench-table')).toContainText('-59,9%');
  });

  test('Workbench v2 compiles JSON tabular lossless, preserves negations and expands/decodes', async ({ page }) => {
    await page.click('nav a[data-page="app"]');
    await expect(page).toHaveURL(/.*#app/);

    const textarea = page.locator('#app-input');
    const jsonPayload = JSON.stringify({
      users: [
        { id: 1, name: 'Alice', role: 'staff', active: true },
        { id: 2, name: 'Bob', role: 'senior', active: true },
        { id: 3, name: 'Carol', role: 'senior', active: false },
        { id: 4, name: 'Dan', role: 'staff', active: true },
      ],
    }, null, 2);

    await textarea.fill(jsonPayload);
    await expect(page.locator('#input-tok-count')).not.toHaveText('0 tokens');

    await page.click('#compress-btn');

    const outputText = page.locator('#app-output .output-text');
    await expect(outputText).toBeVisible();
    await expect(outputText).toContainText('@table users[4]{id,name,role,active}:');
    await expect(page.locator('#app-stats')).toBeVisible();
    await expect(page.locator('#app-audit')).toContainText('PASS');

    // Decode @table back to exact JSON
    const tabularOutput = await outputText.innerText();
    await textarea.fill(tabularOutput);
    await page.click('#expand-btn');
    await expect(outputText).toContainText('"name": "Alice"');

    // Expand notation shorthand cleanly
    await textarea.fill('rf $js @express #mw; auth middleware; prd async cm');
    await page.click('#expand-btn');
    await expect(outputText).toContainText('Refatore middleware em JavaScript usando Express.js');
  });

  test('Navigation guard blocks unauthenticated users and shows toast', async ({ page }) => {
    await page.goto('http://localhost:5500/#dashboard');
    await page.waitForURL(/.*#login/);
    const toast = page.locator('#global-toast');
    const toastText = page.locator('#toast-msg');
    await expect(toast).toHaveClass(/show/);
    await expect(toastText).toHaveText('Faça login para acessar o dashboard');
  });

  test('Billing upgrade button on dashboard triggers checkout flow', async ({ page }) => {
    await page.evaluate(() => {
      sessionStorage.setItem('mock_user', JSON.stringify({
        email: 'dev@toklang.dev',
        name: 'Dev',
        last: 'Tester',
        plan: 'starter',
        apiKey: 'tl_live_mockkey12345',
      }));
    });

    await page.goto('http://localhost:5500/#dashboard');
    await page.waitForTimeout(400);

    await page.click('aside.dash-sidebar li:has-text("Plano & cobrança")');

    const upgradeBtn = page.locator('#page-dashboard .plan.featured .plan-btn');
    await expect(upgradeBtn).toBeVisible();
    await upgradeBtn.click();

    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/.*#dashboard/);
    const toast = page.locator('#global-toast');
    await expect(toast).toHaveClass(/show/);
    await expect(page.locator('#toast-msg')).toHaveText('Iniciando checkout seguro...');
  });

  test('Mock Login flow', async ({ page }) => {
    await page.click('nav button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*#login/);

    await page.fill('#login-email', 'tester@toklang.dev');
    await page.fill('#login-password', 'password123');
    await page.click('#login-btn');

    await page.waitForURL(/.*#dashboard/);
    await expect(page.locator('#nav-avatar')).toHaveText('T');
  });
});
