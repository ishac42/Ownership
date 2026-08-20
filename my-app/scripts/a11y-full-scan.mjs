/**
 * Full axe scan matching axe DevTools "analyze all rules" behavior.
 * Usage: node scripts/a11y-full-scan.mjs [url]
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

async function runFullScan(page, label) {
  const results = await new AxeBuilder({ page }).analyze();

  const violationNodes = results.violations.reduce((n, v) => n + v.nodes.length, 0);
  const incompleteNodes = results.incomplete.reduce((n, v) => n + v.nodes.length, 0);

  console.log(`\n=== ${label} ===`);
  console.log(`Rules violated: ${results.violations.length}`);
  console.log(`Violation nodes (axe "issues"): ${violationNodes}`);
  console.log(`Incomplete rules: ${results.incomplete.length}`);
  console.log(`Incomplete nodes: ${incompleteNodes}`);
  console.log(`Total issue-like count: ${violationNodes + incompleteNodes}`);

  for (const v of [...results.violations, ...results.incomplete]) {
    const kind = results.violations.includes(v) ? 'VIOLATION' : 'INCOMPLETE';
    console.log(`\n[${kind}] ${v.id} (${v.impact}) — ${v.nodes.length} node(s): ${v.help}`);
    for (const node of v.nodes) {
      console.log(`  • ${node.target.join(' > ')}`);
      if (node.failureSummary) {
        console.log(`    ${node.failureSummary.split('\n').join('\n    ')}`);
      }
    }
  }

  return { ...results, violationNodes, incompleteNodes };
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await setupMockRoutes(page);

  await page.goto(`${BASE_URL}?referenceNumber=REF-001`, { waitUntil: 'networkidle' });
  await page.waitForSelector('button:has-text("Add")', { timeout: 15000 });

  const embedded = await runFullScan(page, 'Embedded list view (all rules)');

  await page.getByRole('button', { name: /Chart View/i }).click();
  await page.waitForTimeout(800);
  const chart = await runFullScan(page, 'Chart view (all rules)');

  await page.goto(`${BASE_URL}?referenceNumber=REF-001`, { waitUntil: 'networkidle' });
  await page.waitForSelector('button:has-text("Add")', { timeout: 15000 });
  await page.getByRole('button', { name: /^Add$/i }).first().click();
  await page.waitForSelector('#add-owner-title');
  const addModal = await runFullScan(page, 'Add Owner modal (all rules)');

  const report = {
    url: BASE_URL,
    scans: {
      embedded: {
        violationNodes: embedded.violationNodes,
        incompleteNodes: embedded.incompleteNodes,
        violations: embedded.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
        incomplete: embedded.incomplete.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
      },
      chart: {
        violationNodes: chart.violationNodes,
        incompleteNodes: chart.incompleteNodes,
        violations: chart.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
        incomplete: chart.incomplete.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
      },
      addModal: {
        violationNodes: addModal.violationNodes,
        incompleteNodes: addModal.incompleteNodes,
        violations: addModal.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
        incomplete: addModal.incomplete.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
      },
    },
  };

  writeFileSync('a11y-full-report.json', JSON.stringify(report, null, 2));
  console.log('\nSaved a11y-full-report.json');
  await browser.close();
}

main().catch(console.error);
