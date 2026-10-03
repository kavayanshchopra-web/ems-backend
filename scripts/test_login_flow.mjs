import { chromium } from 'playwright-core';

async function test() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 850 }
  });

  // Inject session directly before any scripts run
  await context.addInitScript(() => {
    try {
      const userData = {
        id: 1,
        email: 'kavayanshchopra@gmail.com',
        name: 'Kavayansh Chopra',
        role: 'superadmin',
        companyName: 'EMS HQ',
        tenantId: 1,
        companyId: 1,
        tenant_id: 1,
        tenantSlug: 'TEN-0001-KAVAYANSH-CHOPRA',
        employeeId: '1'
      };
      window.localStorage.setItem('omnilflow_user', JSON.stringify(userData));
      window.localStorage.setItem('omnilflow_token', 'sandbox_jwt_superadmin');
      window.localStorage.setItem('token', 'sandbox_jwt_superadmin');
      window.localStorage.setItem('omnilflow_current_company', '1');
      console.log('Injected auth into localStorage successfully');
    } catch (e) {
      console.error('Failed to inject auth:', e);
    }
  });

  const page = await context.newPage();
  console.log('Navigating to app...');
  await page.goto('https://app.employeemanagementsystems.com', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(4000);

  const title = await page.title();
  const url = page.url();
  console.log('Page Title:', title, 'URL:', url);

  const hasLogin = await page.locator('text=Welcome Back').isVisible().catch(() => false);
  const hasPayments = await page.locator('text=PAYMENTS').isVisible().catch(() => false);
  console.log('Is Login Page visible?:', hasLogin);
  console.log('Is PAYMENTS visible?:', hasPayments);

  if (hasLogin && !hasPayments) {
    console.log('Checking fallback evaluate...');
    await page.evaluate(() => {
      const userData = {
        id: 1,
        email: 'kavayanshchopra@gmail.com',
        name: 'Kavayansh Chopra',
        role: 'superadmin',
        companyName: 'EMS HQ',
        tenantId: 1,
        companyId: 1,
        tenant_id: 1,
        tenantSlug: 'TEN-0001-KAVAYANSH-CHOPRA',
        employeeId: '1'
      };
      localStorage.setItem('omnilflow_user', JSON.stringify(userData));
      localStorage.setItem('omnilflow_token', 'sandbox_jwt_superadmin');
      localStorage.setItem('token', 'sandbox_jwt_superadmin');
      localStorage.setItem('omnilflow_current_company', '1');
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(4000);
    const hasPaymentsAfterReload = await page.locator('text=PAYMENTS').isVisible().catch(() => false);
    console.log('Is PAYMENTS visible after evaluate + reload?:', hasPaymentsAfterReload);
  }

  await page.screenshot({ path: 'scripts/test_login_screen.png' });
  console.log('Saved screenshot to scripts/test_login_screen.png');

  await browser.close();
}

test().catch(console.error);
