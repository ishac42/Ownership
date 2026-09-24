import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEntity, shouldShowChartNvBusinessId } from '../src/utils/normalize.js';

test('keeps NV Business ID from search and reverse-lookup payloads', () => {
  const fromSearch = normalizeEntity({ ownerName: 'JESSICA BECERRA', nvBusinessId: 'NV20261013' });
  assert.equal(fromSearch.nvBusinessId, 'NV20261013');

  const fromReverse = normalizeEntity({ ownerName: 'Holding Co', nvBusinessID: 'NV999' });
  assert.equal(fromReverse.nvBusinessId, 'NV999');

  const fromSqlAlias = normalizeEntity({ ownerName: 'Org', NVBUSINESSID: 'NV111' });
  assert.equal(fromSqlAlias.nvBusinessId, 'NV111');
});

test('shows NV Business ID on every entity chart node that has one', () => {
  assert.equal(shouldShowChartNvBusinessId(false, 'NV20260218'), true);
  assert.equal(shouldShowChartNvBusinessId(false, '  NV20260218  '), true);
  assert.equal(shouldShowChartNvBusinessId(true, 'NV20260218'), false);
  assert.equal(shouldShowChartNvBusinessId(false, ''), false);
  assert.equal(shouldShowChartNvBusinessId(false, 'null'), false);
  assert.equal(shouldShowChartNvBusinessId(false, '   '), false);
});

test('drops empty or Accela null NV Business ID values', () => {
  assert.equal(normalizeEntity({ ownerName: 'No ID' }).nvBusinessId, '');
  assert.equal(normalizeEntity({ ownerName: 'Null ID', nvBusinessId: 'null' }).nvBusinessId, '');
  assert.equal(normalizeEntity({ ownerName: 'Blank', nvBusinessId: '   ' }).nvBusinessId, '');
});
