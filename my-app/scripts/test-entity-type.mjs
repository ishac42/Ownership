import assert from 'node:assert/strict';
import test from 'node:test';
import { getEntityRef, isOperatingEntityType, ownershipTabId } from '../src/utils/entityType.js';

test('isOperatingEntityType matches Accela / ticket labels', () => {
  assert.equal(isOperatingEntityType('Operating Entity'), true);
  assert.equal(isOperatingEntityType('operating entity*'), true);
  assert.equal(isOperatingEntityType('  OPERATING ENTITY  '), true);
  assert.equal(isOperatingEntityType('Business Organization'), false);
  assert.equal(isOperatingEntityType('Individual'), false);
  assert.equal(isOperatingEntityType('Organization'), false);
});

test('getEntityRef ignores missing placeholders and license nodes', () => {
  assert.equal(getEntityRef({ referenceNbr: '12345' }), '12345');
  assert.equal(getEntityRef({ referenceNumber: '99' }), '99');
  assert.equal(getEntityRef({ referenceNbr: 'N/A' }), '');
  assert.equal(getEntityRef({ referenceNbr: 'lic-ACC104' }), '');
  assert.equal(getEntityRef(null), '');
});

test('ownershipTabId does not collide with related-license tab ids', () => {
  assert.equal(ownershipTabId('12345'), 'ownership-12345');
});
