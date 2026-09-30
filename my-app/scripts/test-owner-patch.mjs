import assert from 'node:assert/strict';
import test from 'node:test';
import {
  insertOwnerUnderParent,
  patchOwnerInTree,
  referenceFromAddResponse,
  removeOwnerFromParent,
  stripOwnerPatchUpdates,
} from '../src/utils/ownershipPatch.js';

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

test('a new owner is inserted under the parent and not a second time', () => {
  const tree = {
    referenceNbr: '1',
    ownerName: 'Parent',
    relatedContacts: [{ referenceNbr: '100', ownerName: 'Existing', relatedContacts: [] }],
  };
  const child = {
    referenceNbr: '200',
    ownerName: 'New Owner',
    percentage: '40',
    relatedContacts: [{ referenceNbr: '999', ownerName: 'Should not copy' }],
  };

  const once = insertOwnerUnderParent(tree, '1', child);
  const twice = insertOwnerUnderParent(once, '1', child);

  assert.equal(once.relatedContacts.length, 2);
  assert.equal(once.relatedContacts[1].referenceNbr, '200');
  assert.equal(once.relatedContacts[1].parentRefNbr, '1');
  assert.deepEqual(once.relatedContacts[1].relatedContacts, []);
  assert.equal(twice.relatedContacts.length, 2);
  assert.equal(tree.relatedContacts.length, 1);
});

test('deleting an owner removes that child only', () => {
  const tree = {
    referenceNbr: '1',
    relatedContacts: [
      { referenceNbr: '200', ownerName: 'New Owner', relatedContacts: [] },
      { referenceNbr: '100', ownerName: 'Existing', relatedContacts: [] },
    ],
  };

  const next = removeOwnerFromParent(tree, '1', '200');
  assert.equal(next.relatedContacts.length, 1);
  assert.equal(next.relatedContacts[0].referenceNbr, '100');
});

test('the add response reference is read from the script result', () => {
  const ref = referenceFromAddResponse({
    data: { result: { result: { referenceNbr: '345678' } } },
  });
  assert.equal(ref, '345678');
  assert.equal(referenceFromAddResponse({}), '');
});
