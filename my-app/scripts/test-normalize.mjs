import assert from 'node:assert/strict';
import test from 'node:test';
import { collectNvBusinessIds, lookupNvBusinessId, normalizeEntity, shouldShowChartNvBusinessId } from '../src/utils/normalize.js';

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

test('reuses a known NV Business ID when the same entity is shown again', () => {
  const known = collectNvBusinessIds({
    referenceNbr: '272148',
    ownerName: "BROWN'S & BROTHERS LLC",
    nvBusinessId: 'NV20260218',
    relatedContacts: [
      { referenceNumber: '111', ownerName: 'JOE BROWN' },
    ],
  });

  assert.equal(known['272148'], 'NV20260218');
  assert.equal(
    lookupNvBusinessId({ referenceNbr: '272148', ownerName: "BROWN'S & BROTHERS LLC" }, known),
    'NV20260218'
  );
  assert.equal(
    lookupNvBusinessId({ referenceNbr: '999', ownerName: "brown's   & brothers llc" }, known),
    'NV20260218'
  );
  assert.equal(lookupNvBusinessId({ referenceNbr: '111' }, known), '');
  assert.equal(shouldShowChartNvBusinessId(false, lookupNvBusinessId({ referenceNbr: '272148' }, known)), true);
  assert.equal(shouldShowChartNvBusinessId(true, lookupNvBusinessId({ referenceNbr: '272148' }, known)), false);
});

test('drops empty or Accela null NV Business ID values', () => {
  assert.equal(normalizeEntity({ ownerName: 'No ID' }).nvBusinessId, '');
  assert.equal(normalizeEntity({ ownerName: 'Null ID', nvBusinessId: 'null' }).nvBusinessId, '');
  assert.equal(normalizeEntity({ ownerName: 'Blank', nvBusinessId: '   ' }).nvBusinessId, '');
});
