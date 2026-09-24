import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEntity } from '../src/utils/normalize.js';

test('keeps NV Business ID from search and reverse-lookup payloads', () => {
  const fromSearch = normalizeEntity({ ownerName: 'JESSICA BECERRA', nvBusinessId: 'NV20261013' });
  assert.equal(fromSearch.nvBusinessId, 'NV20261013');

  const fromReverse = normalizeEntity({ ownerName: 'Holding Co', nvBusinessID: 'NV999' });
  assert.equal(fromReverse.nvBusinessId, 'NV999');

  const fromSqlAlias = normalizeEntity({ ownerName: 'Org', NVBUSINESSID: 'NV111' });
  assert.equal(fromSqlAlias.nvBusinessId, 'NV111');
});

test('drops empty or Accela null NV Business ID values', () => {
  assert.equal(normalizeEntity({ ownerName: 'No ID' }).nvBusinessId, '');
  assert.equal(normalizeEntity({ ownerName: 'Null ID', nvBusinessId: 'null' }).nvBusinessId, '');
  assert.equal(normalizeEntity({ ownerName: 'Blank', nvBusinessId: '   ' }).nvBusinessId, '');
});
