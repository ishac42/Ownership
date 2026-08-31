import assert from 'node:assert/strict';
import test from 'node:test';
import { getEntityRef, isOperatingEntity, ownershipTabId } from '../src/utils/entityType.js';

test('isOperatingEntity matches Accela operating entity labels', () => {
  assert.equal(isOperatingEntity('Operating Entity'), true);
  assert.equal(isOperatingEntity('operating entity*'), true);
  assert.equal(isOperatingEntity('  OPERATING ENTITY  '), true);
  assert.equal(isOperatingEntity('Business Organization'), false);
  assert.equal(isOperatingEntity('Individual'), false);
  assert.equal(isOperatingEntity(''), false);
});

test('getEntityRef ignores missing placeholders', () => {
  assert.equal(getEntityRef({ referenceNbr: '12345' }), '12345');
  assert.equal(getEntityRef({ referenceNumber: '99' }), '99');
  assert.equal(getEntityRef({ referenceNbr: 'N/A' }), '');
  assert.equal(getEntityRef(null), '');
});

test('ownershipTabId does not collide with related-license tab ids', () => {
  assert.equal(ownershipTabId('12345'), 'ownership-12345');
});
