/**
 * Full-page accessibility audit using axe-core (same engine as axe DevTools).
 * Run: node scripts/a11y-audit.mjs [url]
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'fs';

const BASE_URL = process.argv[2] || 'http://localhost:3000';

const MOCK_OWNER = {
  referenceNbr: 'REF-001',
  ownerName: 'ACME CORPORATION',
  nvBusinessId: 'NV123456',
  contactType: 'Organization',
  contactAddress: '123 Main St',
  city: 'Las Vegas',
  state: 'NV',
  zip: '89101',
  country: 'United States',
  ownershipType: 'Organization',
  relatedContacts: [
    {
      referenceNbr: 'REF-002',
      ownerName: 'JANE DOE',
      contactType: 'Individual',
      percentage: '50',
      ownershipType: 'Individual',
      firstName: 'Jane',
      lastName: 'Doe',
      relatedContacts: [],
    },
    {
      referenceNbr: 'REF-003',
      ownerName: 'SUB LLC',
      contactType: 'Organization',
      percentage: '50',
      ownershipType: 'Organization',
      relatedContacts: [],
    },
  ],
};

async function setupMockRoutes(page) {
  await page.addInitScript((mockOwner) => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/retrieve-info')) {
        return new Response(JSON.stringify({
          data: { result: { result: { owners: [mockOwner] } } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/api/reverseRelation')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/')) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    };
  }, MOCK_OWNER);
}

function formatViolations(violations) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({
      html: n.html,
      target: n.target,
      failureSummary: n.failureSummary,
    })),
  }));
}

async function runAxeScan(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'section508', 'best-practice'])
    .analyze();

  console.log(`\n=== ${label} ===`);
  console.log(`Violations: ${results.violations.length}`);
  console.log(`Incomplete: ${results.incomplete.length}`);
  console.log(`Passes: ${results.passes.length}`);

  for (const v of results.violations) {
    console.log(`\n[${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`);
    console.log(`  ${v.description}`);
    for (const node of v.nodes.slice(0, 5)) {
      console.log(`  - ${node.target.join(' > ')}`);
      if (node.failureSummary) console.log(`    ${node.failureSummary.replace(/\n/g, '\n    ')}`);
    }
    if (v.nodes.length > 5) console.log(`  ... and ${v.nodes.length - 5} more`);
  }

  return results;
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();
  await setupMockRoutes(page);

  const allResults = {};

  // 1. Search page (default view)
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  allResults.searchPage = await runAxeScan(page, 'Search Page (initial)');

  // 2. Search page with results loaded
  await page.getByRole('textbox', { name: 'Name' }).fill('ACME');
  await page.getByRole('textbox', { name: 'Name' }).press('Enter');
  await page.waitForSelector('tr[tabindex="0"]', { timeout: 10000 });
  allResults.searchWithResults = await runAxeScan(page, 'Search Page (with results)');

  // Select first result for detail view
  await page.locator('tr[tabindex="0"]').first().click();
  await page.waitForTimeout(500);
  allResults.recordDetail = await runAxeScan(page, 'Record Detail (list view)');

  // 3. Record detail view (embedded mode)
  await page.goto(`${BASE_URL}?referenceNumber=REF-001`, { waitUntil: 'networkidle' });
  await page.waitForSelector('button:has-text("List View"), button:has-text("Add")', { timeout: 10000 });
  allResults.embeddedDetail = await runAxeScan(page, 'Embedded Detail View');

  // 4. Chart view
  const chartBtn = page.getByRole('button', { name: /Chart View/i });
  if (await chartBtn.isVisible()) {
    await chartBtn.click();
    await page.waitForTimeout(800);
    allResults.chartView = await runAxeScan(page, 'Chart View');
  }

  // 5. Add Owner modal (from list view on embedded page)
  await page.goto(`${BASE_URL}?referenceNumber=REF-001`, { waitUntil: 'networkidle' });
  await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });
  const listAddBtn = page.getByRole('button', { name: /^Add$/i }).first();
  if (await listAddBtn.isVisible()) {
    await listAddBtn.click();
    await page.waitForSelector('#add-owner-title', { timeout: 5000 });
    allResults.addOwnerModal = await runAxeScan(page, 'Add Owner Modal');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForSelector('#add-owner-title', { state: 'hidden', timeout: 5000 });
  }

  // 6. View owner details modal (from list view)
  const viewDetailsBtn = page.getByRole('button', { name: /View details for/i }).first();
  if (await viewDetailsBtn.isVisible()) {
    await viewDetailsBtn.click();
    await page.waitForSelector('#owner-details-title', { timeout: 5000 });
    allResults.ownerDetailsModal = await runAxeScan(page, 'Owner Details Modal');
  }

  const report = {
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    summary: Object.fromEntries(
      Object.entries(allResults).map(([k, r]) => [
        k,
        {
          violations: r.violations.length,
          incomplete: r.incomplete.length,
          violationIds: [...new Set(r.violations.map((v) => v.id))],
        },
      ])
    ),
    details: Object.fromEntries(
      Object.entries(allResults).map(([k, r]) => [k, { violations: formatViolations(r.violations) }])
    ),
  };

  writeFileSync('a11y-report.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to a11y-report.json');

  const totalViolations = Object.values(allResults).reduce((sum, r) => sum + r.violations.length, 0);
  await browser.close();
  process.exit(totalViolations > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
