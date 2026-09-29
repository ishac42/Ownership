import assert from 'node:assert/strict';
import test from 'node:test';
import { patchOwnerInTree, stripOwnerPatchUpdates } from '../src/utils/ownershipPatch.js';

test('an edit patch keeps field changes and drops the cached subtree', () => {
  const saved = stripOwnerPatchUpdates({
    ownerName: 'Edited Owner',
    referenceNbr: '100',
    percentage: '25',
    status: 'Active',
    relatedContacts: [{ referenceNbr: '100', ownerName: 'Edited Owner' }],
    _licenses: [{ licenseAltId: 'LIC-1' }],
  });

  assert.equal(saved.ownerName, 'Edited Owner');
  assert.equal(saved.percentage, '25');
  assert.equal(saved.status, 'Active');
  assert.equal(Object.hasOwn(saved, 'relatedContacts'), false);
  assert.equal(Object.hasOwn(saved, '_licenses'), false);
});

test('applying an edit does not add a second copy of the contact', () => {
  const tree = {
    referenceNbr: '1',
    ownerName: 'Parent',
    relatedContacts: [
      { referenceNbr: '100', ownerName: 'Original', relatedContacts: [] },
    ],
  };

  const patched = patchOwnerInTree(tree, '100', {
    ownerName: 'Edited Owner',
    relatedContacts: [
      { referenceNbr: '100', ownerName: 'Edited Owner' },
      { referenceNbr: '200', ownerName: 'Extra' },
    ],
  });

  const children = patched.relatedContacts;
  assert.equal(children.length, 1);
  assert.equal(children[0].referenceNbr, '100');
  assert.equal(children[0].ownerName, 'Edited Owner');
  assert.deepEqual(children[0].relatedContacts, []);
});
