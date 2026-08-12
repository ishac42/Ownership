/**
 * Full local axe audit — real API, no mocks.
 * Usage: node scripts/a11y-local.mjs [url]
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'fs';

const BASE = process.argv[2] || 'http://localhost:3000';

async function scan(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'section508', 'best-practice'])
    .analyze();

  const vNodes = results.violations.reduce((n, v) => n + v.nodes.length, 0);
  const iNodes = results.incomplete.reduce((n, v) => n + v.nodes.length, 0);

  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${page.url()}`);
  console.log(`Violations: ${vNodes} | Incomplete: ${iNodes}`);

  for (const v of results.violations) {
    console.log(`\n[VIOLATION] ${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`);
    for (const node of v.nodes.slice(0, 8)) {
      console.log(`  • ${node.target.join(' > ')}`);
      if (node.failureSummary) console.log(`    ${node.failureSummary.split('\n').join('\n    ')}`);
    }
  }
  for (const v of results.incomplete) {
    console.log(`\n[INCOMPLETE] ${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`);
    for (const node of v.nodes.slice(0, 8)) {
      console.log(`  • ${node.target.join(' > ')}`);
    }
  }

  return { results, vNodes, iNodes, label };
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const scans = [];

  // 1. Home
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  scans.push(await scan(page, 'Search portal (home)'));

  // 2. Search with real API
  await page.getByRole('textbox', { name: 'Name' }).fill('LLC');
  await page.getByRole('button', { name: /submit name search/i }).click();
  await page.waitForSelector('tr[tabindex="0"]', { timeout: 60000 });
  scans.push(await scan(page, 'Search with results'));

  await page.locator('tr[tabindex="0"]').first().click();
  await page.waitForTimeout(1500);
  scans.push(await scan(page, 'Record detail (list)'));

  // 3. Chart
  await page.getByRole('button', { name: /Chart View/i }).click();
  await page.waitForTimeout(1000);
  scans.push(await scan(page, 'Chart view'));

  // 4. Add owner modal (list view)
  await page.getByRole('button', { name: /List View/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Add$/i }).first().click();
  await page.waitForSelector('#add-owner-title', { timeout: 10000 });
  scans.push(await scan(page, 'Add Owner modal'));
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(500);

  // 5. Owner details
  await page.getByRole('button', { name: /View details for/i }).first().click();
  await page.waitForSelector('#owner-details-title', { timeout: 10000 });
  scans.push(await scan(page, 'Owner details modal'));

  // 6. Edit form
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(800);
  scans.push(await scan(page, 'Edit owner form'));

  // 7. Embedded mode
  const ref = await page.locator('tr[tabindex="0"]').first().locator('td').nth(1).textContent().catch(() => '243102');
  await page.goto(`${BASE}?referenceNumber=${encodeURIComponent((ref || '243102').trim())}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForSelector('button:has-text("Add"), button:has-text("List View")', { timeout: 60000 });
  await page.waitForTimeout(1500);
  scans.push(await scan(page, 'Embedded detail view'));

  const totalV = scans.reduce((s, x) => s + x.vNodes, 0);
  const totalI = scans.reduce((s, x) => s + x.iNodes, 0);
  console.log(`\n========== SUMMARY ==========`);
  console.log(`Total violation nodes: ${totalV}`);
  console.log(`Total incomplete nodes: ${totalI}`);
  console.log(`Grand total issue nodes: ${totalV + totalI}`);

  writeFileSync('a11y-local-report.json', JSON.stringify({ base: BASE, totalV, totalI, scans: scans.map((s) => ({ label: s.label, vNodes: s.vNodes, iNodes: s.iNodes })) }, null, 2));
  await browser.close();
  process.exit(totalV > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
