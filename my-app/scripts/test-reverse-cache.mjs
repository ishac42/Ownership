import assert from 'node:assert/strict';
import test from 'node:test';
import {
  childReferenceIdsOf,
  groupReverseParentsByChildRef,
  mergeReverseRelationCache,
} from '../src/utils/reverseCache.js';

test('indexes a reverse parent under every searched child it belongs to', () => {
  const parent = {
    referenceNbr: '111',
    ownerName: 'Holding Co',
    childReferenceId: '248593',
    childReferenceIds: ['248593', '999001'],
    hierarchyPath: '248593 > 111',
  };

  const grouped = groupReverseParentsByChildRef([parent]);
  assert.equal(grouped['248593'].length, 1);
  assert.equal(grouped['999001'].length, 1);
  assert.equal(grouped['248593'][0].referenceNbr, '111');
  assert.deepEqual(childReferenceIdsOf(parent).sort(), ['248593', '999001']);
});

test('does not replace visible related entities with an empty refetch', () => {
  const prev = {
    '999001': [{ referenceNbr: '111', ownerName: 'Holding Co', childReferenceId: '999001' }],
  };
  const merged = mergeReverseRelationCache(prev, { '999001': [] });

  assert.equal(merged['999001'].length, 1);
  assert.equal(merged['999001'][0].ownerName, 'Holding Co');
});

test('keeps existing related entities and adds newly fetched ones', () => {
  const merged = mergeReverseRelationCache(
    { A: [{ referenceNbr: '1', ownerName: 'Parent A' }] },
    { A: [{ referenceNbr: '2', ownerName: 'Parent B' }] }
  );

  assert.equal(merged.A.length, 2);
  assert.deepEqual(
    merged.A.map((row) => row.referenceNbr).sort(),
    ['1', '2']
  );
});
