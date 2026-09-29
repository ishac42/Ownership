import assert from 'node:assert/strict';
import test from 'node:test';
import {
  childReferenceIdsOf,
  groupReverseParentsByChildRef,
  mergeReverseRelationCache,
  patchReverseRelationCache,
  replaceReverseRelationCache,
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
  assert.deepEqual(childReferenceIdsOf(parent).sort(), ['111', '248593', '999001']);
});

test('indexes TEST OWN reverse row under its own ref so related licenses are not dropped', () => {
  const row = {
    childReferenceId: '248622',
    referenceNbr: '248614',
    ownerName: 'Test Own',
    contactType: 'Operating Entity',
    licenseAltId: 'ENT105-0000421',
    nvBusinessId: 'N0921010',
  };

  const grouped = groupReverseParentsByChildRef([row]);
  assert.equal(grouped['248622'][0].licenseAltId, 'ENT105-0000421');
  assert.equal(grouped['248614'][0].licenseAltId, 'ENT105-0000421');
});

test('a reverse lookup replaces that contact cache, including an empty result', () => {
  const replaced = replaceReverseRelationCache(
    {
      A: [{ referenceNbr: '1', ownerName: 'Old' }],
      B: [{ referenceNbr: '2', ownerName: 'Keep' }],
    },
    { A: [] }
  );

  assert.deepEqual(replaced.A, []);
  assert.equal(replaced.B[0].ownerName, 'Keep');
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

test('a refetch of the same contact replaces the cached row', () => {
  const merged = mergeReverseRelationCache(
    { A: [{ referenceNbr: '1', ownerName: 'Old Name', relatedContacts: [{ referenceNbr: '9' }] }] },
    { A: [{ referenceNbr: '1', ownerName: 'New Name' }] }
  );

  assert.equal(merged.A.length, 1);
  assert.equal(merged.A[0].ownerName, 'New Name');
  assert.equal(merged.A[0].relatedContacts.length, 1);
});

test('an edit patch updates every reverse cache bucket and does not add a row', () => {
  const patched = patchReverseRelationCache(
    {
      A: [{ referenceNbr: '100', ownerName: 'Old', relatedContacts: [] }],
      B: [{ referenceNbr: '100', ownerName: 'Old', relatedContacts: [{ referenceNbr: '100', ownerName: 'Old' }] }],
    },
    {
      '100': {
        ownerName: 'Edited',
        relatedContacts: [{ referenceNbr: '100', ownerName: 'Edited' }, { referenceNbr: '200', ownerName: 'Extra' }],
      },
    }
  );

  assert.equal(patched.A.length, 1);
  assert.equal(patched.A[0].ownerName, 'Edited');
  assert.deepEqual(patched.A[0].relatedContacts, []);
  assert.equal(patched.B.length, 1);
  assert.equal(patched.B[0].relatedContacts.length, 1);
  assert.equal(patched.B[0].relatedContacts[0].ownerName, 'Edited');
});
