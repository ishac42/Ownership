import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext()).newPage();
const apiCalls = [];

page.on('response', async (r) => {
  if (r.url().includes('/api/')) {
    apiCalls.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  }
});
page.on('requestfailed', (r) => {
  if (r.url().includes('/api/')) {
    apiCalls.push(`FAILED ${r.url()} ${r.failure()?.errorText}`);
  }
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
await page.getByRole('textbox', { name: 'Name' }).fill('LLC');
await page.getByRole('button', { name: /submit name search/i }).click();
await page.waitForTimeout(15000);

const rows = await page.locator('tr[tabindex="0"]').count();
const bodyText = await page.locator('tbody').innerText();

console.log('API calls:', apiCalls.join('\n'));
console.log('Result rows:', rows);
console.log('Table body:', bodyText.slice(0, 300));

await browser.close();
