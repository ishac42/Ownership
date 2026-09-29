import assert from 'node:assert/strict';
import test from 'node:test';
import { CHART_LEGEND_ITEMS, nodeColorClasses } from '../src/utils/chartNodeColors.js';

test('legend lists owner and record colors', () => {
  assert.deepEqual(
    CHART_LEGEND_ITEMS.map((item) => item.label),
    [
      'Individual',
      'Organization',
      'License record',
      'Application record',
      'Permit record',
    ],
  );
  for (const item of CHART_LEGEND_ITEMS) {
    assert.ok(item.swatchClass.trim().length > 0, `${item.id} needs a swatch`);
  }
  assert.equal(CHART_LEGEND_ITEMS.some((item) => item.id === 'terminated'), false);
  assert.deepEqual(
    CHART_LEGEND_ITEMS.map((item) => item.group),
    ['Owners', 'Owners', 'Records', 'Records', 'Records'],
  );
});

test('node colors prefer permit, then application, then license over owner type', () => {
  assert.equal(
    nodeColorClasses({
      isIndividual: true,
      isLicenseNode: true,
      isPermit: true,
      isPendingApplication: true,
    }),
    'bg-teal-700 border-teal-800',
  );
  assert.equal(
    nodeColorClasses({
      isIndividual: false,
      isLicenseNode: true,
      isPermit: false,
      isPendingApplication: true,
    }),
    'bg-amber-600 border-amber-700',
  );
  assert.equal(
    nodeColorClasses({
      isIndividual: true,
      isLicenseNode: true,
      isPermit: false,
      isPendingApplication: false,
    }),
    'bg-[#1e40af] border-[#1e3a8a]',
  );
});

test('owner boxes are teal for individuals and burgundy for organizations', () => {
  assert.equal(
    nodeColorClasses({
      isIndividual: true,
      isLicenseNode: false,
      isPermit: false,
      isPendingApplication: false,
    }),
    'bg-[#267471] border-[#1e5c5a]',
  );
  assert.equal(
    nodeColorClasses({
      isIndividual: false,
      isLicenseNode: false,
      isPermit: false,
      isPendingApplication: false,
    }),
    'bg-[#792454] border-[#611d43]',
  );
});
