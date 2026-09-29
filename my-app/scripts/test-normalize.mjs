import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEntity, shouldShowNvBusinessId } from '../src/utils/normalize.js';

test('keeps NV Business ID from search and reverse payloads', () => {
  assert.equal(normalizeEntity({ ownerName: 'NVOneTime', nvBusinessId: 'NV11198191' }).nvBusinessId, 'NV11198191');
  assert.equal(normalizeEntity({ ownerName: 'Holding Co', nvBusinessID: 'NV999' }).nvBusinessId, 'NV999');
  assert.equal(normalizeEntity({ ownerName: 'Org', NVBUSINESSID: 'NV111' }).nvBusinessId, 'NV111');
});

test('shows NV Business ID on every entity node that has one', () => {
  assert.equal(shouldShowNvBusinessId(false, 'NV11198191'), true);
  assert.equal(shouldShowNvBusinessId(true, 'NV11198191'), false);
  assert.equal(shouldShowNvBusinessId(false, ''), false);
  assert.equal(shouldShowNvBusinessId(false, 'null'), false);
  assert.equal(shouldShowNvBusinessId(false, '   '), false);
});
