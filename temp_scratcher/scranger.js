import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/Lenovo/.gemini/antigravity-ide/brain/f848a984-058b-45dd-bf5f-da24f8a9ca49';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to login page...');
    await page.goto('https://app.employeemanagementsystems.com/login', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Typing credentials...');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.type('input[type="email"]', 'Kavayanshchopra@gmail.com');

    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.type('input[type="password"]', 'Kavay@113');

    console.log('Submitting login...');
    const submitBtn = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    console.log('Waiting for login redirect...');
    await new Promise(r => setTimeout(r, 8000));

    console.log('Expanding all sidebar accordion buttons...');
    await page.evaluate(() => {
      const categories = [
        'SYSTEM', 'DASHBOARDS', 'HR MANAGEMENT', 'PAYROLL & FINANCE', 
        'CRM & SALES', 'OPERATIONS', 'MY PORTAL', 'HELP & SUPPORT', 'SETTINGS'
      ];
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.forEach(btn => {
        const txt = (btn.innerText || '').trim();
        if (categories.some(c => txt.includes(c))) {
          console.log('Expanding category:', txt);
          btn.click();
        }
      });
    });

    await new Promise(r => setTimeout(r, 2000));

    // Get all anchor elements links now that dropdowns are expanded
    const sidebarLinks = await page.evaluate(() => {
      // Find links specifically inside the sidebar nav or general links
      return Array.from(document.querySelectorAll('a')).map(el => ({
        text: el.innerText.trim(),
        href: el.getAttribute('href')
      })).filter(l => l.text.length > 2 && l.href && !l.href.startsWith('#') && !l.href.includes('logout'));
    });

    console.log('Discovered expanded links:', sidebarLinks);

    // Save initial dashboard
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ems_dashboard_main.png') });

    // Loop and click each link
    for (const link of sidebarLinks) {
      try {
        console.log(`Navigating to link: "${link.text}" via href "${link.href}"...`);
        // We can navigate directly via page.goto or by clicking the element
        // Direct navigation is more reliable to bypass click obstruction errors!
        const targetUrl = link.href.startsWith('http') ? link.href : `https://app.employeemanagementsystems.com${link.href}`;
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000)); // wait to load charts/maps

        const filename = `ems_view_${link.text.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, filename) });
        console.log(`Saved screenshot for ${link.text} to ${filename}`);
      } catch (err) {
        console.log(`Error loading link ${link.text}:`, err.message);
      }
    }

  } catch (err) {
    console.error('Execution error:', err);
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
}

run();
