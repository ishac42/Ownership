import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ownershipPercentChangeError,
  ownershipTotalAtCap,
  parseOwnershipPercent,
  type OwnershipPercentChange,
} from './ownershipStatus.ts';

const change = (overrides: Partial<OwnershipPercentChange>): OwnershipPercentChange => ({
  currentActiveTotal: 0,
  ownerCurrentPercent: 0,
  ownerCurrentlyCounts: false,
  nextPercent: 0,
  nextCounts: true,
  percentChanged: true,
  isNewOwner: false,
  ...overrides,
});

test('parseOwnershipPercent accepts numbers and percent signs', () => {
  assert.equal(parseOwnershipPercent('25'), 25);
  assert.equal(parseOwnershipPercent('25%'), 25);
  assert.equal(parseOwnershipPercent(40), 40);
  assert.equal(parseOwnershipPercent(''), null);
  assert.equal(parseOwnershipPercent('abc'), null);
});

test('a new owner can be saved while the active total is under 100', () => {
  assert.equal(ownershipPercentChangeError(change({
    currentActiveTotal: 0,
    nextPercent: 25,
    isNewOwner: true,
  })), null);
  assert.equal(ownershipPercentChangeError(change({
    currentActiveTotal: 75,
    nextPercent: 25,
    isNewOwner: true,
  })), null);
});

test('a new owner cannot push the active total over 100', () => {
  const message = ownershipPercentChangeError(change({
    currentActiveTotal: 60,
    nextPercent: 50,
    isNewOwner: true,
  }));
  assert.ok(message);
  assert.match(message, /110%/);
  assert.match(message, /40% remaining/);
});

test('add is blocked when active owners already total 100 or more', () => {
  assert.equal(ownershipTotalAtCap(100), true);
  assert.equal(ownershipTotalAtCap(3400), true);
  assert.equal(ownershipTotalAtCap(99.99), false);

  assert.match(ownershipPercentChangeError(change({
    currentActiveTotal: 100,
    nextPercent: 0,
    isNewOwner: true,
  })) ?? '', /already total 100%/);

  assert.match(ownershipPercentChangeError(change({
    currentActiveTotal: 3400,
    nextPercent: 100,
    isNewOwner: true,
  })) ?? '', /already total 3400%/);
});

test('a typed percent must be from 0 through 100', () => {
  assert.match(ownershipPercentChangeError(change({ nextPercent: 150 })) ?? '', /between 0 and 100/);
  assert.match(ownershipPercentChangeError(change({ nextPercent: -1 })) ?? '', /between 0 and 100/);
  assert.match(ownershipPercentChangeError(change({ nextPercent: null })) ?? '', /Enter a percent/);
  assert.equal(ownershipPercentChangeError(change({ nextPercent: 0 })), null);
  assert.equal(ownershipPercentChangeError(change({ nextPercent: 100 })), null);
});

test('editing can fill the remaining room and cannot exceed it', () => {
  assert.equal(ownershipPercentChangeError(change({
    currentActiveTotal: 90,
    ownerCurrentPercent: 40,
    ownerCurrentlyCounts: true,
    nextPercent: 50,
  })), null);

  assert.match(ownershipPercentChangeError(change({
    currentActiveTotal: 90,
    ownerCurrentPercent: 40,
    ownerCurrentlyCounts: true,
    nextPercent: 60,
  })) ?? '', /110%/);
});

test('an over-100 total can be lowered or left unchanged, but not raised', () => {
  assert.equal(ownershipPercentChangeError(change({
    currentActiveTotal: 3400,
    ownerCurrentPercent: 100,
    ownerCurrentlyCounts: true,
    nextPercent: 50,
  })), null);

  assert.equal(ownershipPercentChangeError(change({
    currentActiveTotal: 3400,
    ownerCurrentPercent: 100,
    ownerCurrentlyCounts: true,
    nextPercent: 100,
    percentChanged: false,
  })), null);

  assert.match(ownershipPercentChangeError(change({
    currentActiveTotal: 3400,
    ownerCurrentPercent: 50,
    ownerCurrentlyCounts: true,
    nextPercent: 80,
  })) ?? '', /cannot go any higher/);
});

test('an unchanged legacy percent above 100 does not block other edits', () => {
  assert.equal(ownershipPercentChangeError(change({
    currentActiveTotal: 150,
    ownerCurrentPercent: 150,
    ownerCurrentlyCounts: true,
    nextPercent: 150,
    percentChanged: false,
  })), null);
});

test('terminating an owner is allowed and reactivating one cannot push the total over 100', () => {
  assert.equal(ownershipPercentChangeError(change({
    currentActiveTotal: 100,
    ownerCurrentPercent: 40,
    ownerCurrentlyCounts: true,
    nextPercent: 40,
    nextCounts: false,
    percentChanged: false,
  })), null);

  assert.match(ownershipPercentChangeError(change({
    currentActiveTotal: 80,
    ownerCurrentPercent: 30,
    ownerCurrentlyCounts: false,
    nextPercent: 30,
    nextCounts: true,
    percentChanged: false,
  })) ?? '', /110%/);

  assert.equal(ownershipPercentChangeError(change({
    currentActiveTotal: 50,
    ownerCurrentPercent: 30,
    ownerCurrentlyCounts: false,
    nextPercent: 30,
    nextCounts: true,
    percentChanged: false,
  })), null);
});
