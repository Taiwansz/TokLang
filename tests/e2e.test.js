const { test, expect } = require('@playwright/test');

test.describe('TokLang Web Application - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Go to home page
    await page.goto('http://localhost:5500/#home');
  });

  test('Homepage navigation and basic layout', async ({ page }) => {
    // Check main title
    await expect(page.locator('nav .nav-logo')).toHaveText('TokLang');
    
    // Check navigation links
    const navLinks = page.locator('.nav-links li a');
    await expect(navLinks).toHaveCount(4);
    await expect(navLinks.nth(0)).toHaveText('Início');
    await expect(navLinks.nth(1)).toHaveText('App');
    await expect(navLinks.nth(2)).toHaveText('Docs');
    await expect(navLinks.nth(3)).toHaveText('Preços');
  });

  test('Compressor (App Page) local compression & expansion', async ({ page }) => {
    // Navigate to App
    await page.click('nav a[data-page="app"]');
    await expect(page).toHaveURL(/.*#app/);
    
    // Input prompt
    const textarea = page.locator('#app-input');
    await textarea.fill('Cria um script python usando streamlit para calcular velocidade de forma bonita');
    
    // Check character and token counts
    await expect(page.locator('#input-tok-count')).not.toHaveText('0 tokens');
    
    // Click compress
    await page.click('#compress-btn');
    
    // Output should contain compressed version
    const outputText = page.locator('#app-output .output-text');
    await expect(outputText).toBeVisible();
    await expect(outputText).toContainText('cr $py @streamlit');

    // Stats card should be visible
    await expect(page.locator('#app-stats')).toBeVisible();
    
    // Now let's try expanding a TokLang shorthand
    await textarea.fill('rf $js @express #mw; auth middleware; prd async cm');
    await page.click('#expand-btn');
    
    // Output should contain expanded natural language
    await expect(outputText).toBeVisible();
    await expect(outputText).toContainText('Refatore middleware em JavaScript usando Express.js');
  });

  test('Navigation guard successfully blocks unauthenticated users and shows toast', async ({ page }) => {
    // Navigate directly to dashboard via hash URL
    await page.goto('http://localhost:5500/#dashboard');
    
    // We should be redirected to login page eventually
    await page.waitForURL(/.*#login/);
    
    // The guard toast 'Faça login para acessar o dashboard' should be shown
    const toast = page.locator('#global-toast');
    const toastText = page.locator('#toast-msg');
    
    await expect(toast).toHaveClass(/show/);
    await expect(toastText).toHaveText('Faça login para acessar o dashboard');
  });

  test('Billing upgrade button on dashboard triggers checkout flow', async ({ page }) => {
    // Let's mock a user in sessionStorage to behave as logged in
    await page.evaluate(() => {
      sessionStorage.setItem('mock_user', JSON.stringify({
        email: 'dev@toklang.dev',
        name: 'Dev',
        last: 'Tester',
        plan: 'starter',
        apiKey: 'tl_live_mockkey12345'
      }));
    });

    // Go to dashboard
    await page.goto('http://localhost:5500/#dashboard');
    await page.waitForTimeout(500);

    // Navigate to Plan & Billing tab using desktop sidebar specifically
    await page.click('aside.dash-sidebar li:has-text("Plano & cobrança")');

    // Find the upgrade button for Pro, scoped to #page-dashboard
    const upgradeBtn = page.locator('#page-dashboard .plan.featured .plan-btn');
    await expect(upgradeBtn).toBeVisible();

    // Click it
    await upgradeBtn.click();

    // Wait and check that we are still on the dashboard page (since we mock checkout in dev)
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/.*#dashboard/);

    // Verify the correct checkout toast message appeared
    const toast = page.locator('#global-toast');
    await expect(toast).toHaveClass(/show/);
    await expect(page.locator('#toast-msg')).toHaveText('Iniciando checkout seguro...');
  });

  test('Mock Login flow', async ({ page }) => {
    await page.click('nav button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*#login/);

    // Fill form
    await page.fill('#login-email', 'tester@toklang.dev');
    await page.fill('#login-password', 'password123');
    
    // Click submit
    await page.click('#login-btn');
    
    // Wait and verify we are redirected to dashboard
    await page.waitForURL(/.*#dashboard/);
    
    // Check if correct initials appear in avatar
    const avatar = page.locator('#nav-avatar');
    await expect(avatar).toHaveText('T'); // From email split 'tester'
  });
});
