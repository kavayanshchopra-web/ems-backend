import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

async function runAutonomousDemo() {
  console.log('🚀 Starting Autonomous Demo Walkthrough with Local Google Chrome...');
  
  const videoDir = path.resolve('./recorded_videos');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  // Launch local Google Chrome with slowMo for natural presentation pacing
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false, // Visible on screen
    slowMo: 700      // Smooth 700ms delays between actions
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1440, height: 900 }
    }
  });

  // Inject session directly into localStorage before any page code runs
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
    } catch (e) {
      console.error('Failed to inject auth:', e);
    }
  });

  const page = await context.newPage();
  
  try {
    console.log('📍 Step 1: Navigating to EMS App Dashboard...');
    await page.goto('https://app.employeemanagementsystems.com', { waitUntil: 'load', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Fallback if still on login page
    const loginHeading = page.locator('text=Welcome Back').first();
    if (await loginHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('⚠️ Login page detected, applying direct auth & reload...');
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
      await page.waitForTimeout(3000);
    }

    console.log('📍 Step 2: Locating and opening PAYMENTS module...');
    // Locate the Payments app card or button
    const paymentsCard = page.locator('div:has-text("PAYMENTS"), button:has-text("PAYMENTS"), [data-page="payments"]').last();
    if (await paymentsCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('👉 Moving mouse to PAYMENTS card...');
      await paymentsCard.hover();
      await page.waitForTimeout(1000);
      console.log('👉 Clicking PAYMENTS card...');
      await paymentsCard.click();
      await page.waitForTimeout(4000);
    } else {
      // Direct navigation fallback
      console.log('👉 Navigating directly to /payments...');
      await page.goto('https://app.employeemanagementsystems.com/#/payments', { waitUntil: 'load' }).catch(() => {});
      await page.waitForTimeout(3500);
    }

    console.log('📍 Step 3: Highlighting Revenue Analytics & Overview...');
    await page.mouse.move(400, 250, { steps: 25 });
    await page.waitForTimeout(2000);

    console.log('📍 Step 4: Scrolling to Transactions Table...');
    await page.mouse.wheel(0, 380);
    await page.waitForTimeout(2000);

    console.log('📍 Step 5: Finding and clicking "View Answers" button...');
    const viewAnswersBtn = page.locator('button:has-text("View Answers")').first();
    if (await viewAnswersBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      console.log('👉 Hovering over "View Answers"...');
      await viewAnswersBtn.hover();
      await page.waitForTimeout(1000);
      console.log('👉 Opening View Answers Modal...');
      await viewAnswersBtn.click();
      await page.waitForTimeout(4500); // 4.5 seconds for viewers to read questions & answers

      // Close modal
      const closeBtn = page.locator('button:has-text("Close"), [aria-label="Close"], button:has-text("×")').first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('👉 Closing View Answers Modal...');
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(2000);
    }

    console.log('📍 Step 6: Navigating to CONTACTS to show CRM Sync...');
    const appsBtn = page.locator('button:has-text("Apps"), div:has-text("Apps")').first();
    if (await appsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await appsBtn.click();
      await page.waitForTimeout(1500);
    }

    const contactsCard = page.locator('div:has-text("CONTACTS"), button:has-text("CONTACTS")').last();
    if (await contactsCard.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log('👉 Opening CONTACTS module...');
      await contactsCard.click();
      await page.waitForTimeout(4000);

      // Highlight the paid customer tag
      console.log('👉 Highlighting customer list...');
      await page.mouse.move(500, 350, { steps: 20 });
      await page.waitForTimeout(2500);
    }

    console.log('📍 Step 7: Finishing walkthrough recording smoothly...');
    await page.waitForTimeout(2000);

  } catch (err) {
    console.error('❌ Demo Error during navigation:', err.message);
  } finally {
    // Save video
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (video) {
      const savedPath = await video.path();
      console.log('🎥 Video recording successfully captured at:', savedPath);
      const targetName = path.join(videoDir, `EMS_Full_Demo_${Date.now()}.webm`);
      fs.renameSync(savedPath, targetName);
      console.log('🎉 Final Finished Video File:', targetName);
    }
  }
}

runAutonomousDemo().catch(console.error);
