/**
 * Live axe scan — no API mocks. Usage: node scripts/a11y-live-scan.mjs [url]
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'fs';

const BASE = process.argv[2] || 'https://ownership-ui.onrender.com';

async function scan(page, label) {
  const results = await new AxeBuilder({ page }).analyze();
  const vNodes = results.violations.reduce((n, v) => n + v.nodes.length, 0);
  const iNodes = results.incomplete.reduce((n, v) => n + v.nodes.length, 0);

  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${page.url()}`);
  console.log(`Violations: ${results.violations.length} rules / ${vNodes} nodes`);
  console.log(`Incomplete: ${results.incomplete.length} rules / ${iNodes} nodes`);
  console.log(`TOTAL ISSUES (violations + incomplete nodes): ${vNodes + iNodes}`);

  for (const bucket of [
    { name: 'VIOLATION', items: results.violations },
    { name: 'INCOMPLETE', items: results.incomplete },
  ]) {
    for (const v of bucket.items) {
      console.log(`\n[${bucket.name}] ${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`);
      for (const node of v.nodes) {
        console.log(`  • ${node.html?.slice(0, 120)}`);
        console.log(`    ${node.target.join(' > ')}`);
      }
    }
  }

  return { results, vNodes, iNodes };
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();

  const all = {};

  // 1. Search portal home
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  all.home = await scan(page, 'Search portal (home)');

  // 2. Try a search if API works — listen for failed requests
  const failed = [];
  page.on('requestfailed', (r) => failed.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));

  await page.getByRole('textbox', { name: 'Name' }).fill('A');
  await page.getByRole('button', { name: /submit name search/i }).click();
  await page.waitForTimeout(5000);
  all.afterSearch = await scan(page, 'Search portal (after search attempt)');

  // 3. Embedded mode without ref (empty state)
  await page.goto(`${BASE}?referenceNumber=`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  all.embeddedEmpty = await scan(page, 'Embedded (no ref)');

  // 4. Common test ref from mock — may fail on live
  await page.goto(`${BASE}?referenceNumber=REF-001`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  all.embeddedRef = await scan(page, 'Embedded (?referenceNumber=REF-001)');

  // Chart if available
  const chartBtn = page.getByRole('button', { name: /Chart View/i });
  if (await chartBtn.isVisible().catch(() => false)) {
    await chartBtn.click();
    await page.waitForTimeout(1000);
    all.chart = await scan(page, 'Chart view');
  }

  if (failed.length) {
    console.log('\n--- Failed network requests ---');
    failed.slice(0, 10).forEach((f) => console.log(f));
  }

  const total = Object.values(all).reduce((s, x) => s + x.vNodes + x.iNodes, 0);
  console.log(`\n=== GRAND TOTAL ISSUE NODES: ${total} ===`);

  writeFileSync('a11y-live-report.json', JSON.stringify({ base: BASE, total, scans: all }, null, 2));
  await browser.close();
}

main().catch(console.error);
