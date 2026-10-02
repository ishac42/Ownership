import assert from 'node:assert/strict';
import test from 'node:test';
import { sortOwnershipChildren } from '../src/utils/ownershipOrder.js';

test('lists owners from largest percent to smallest, then by name', () => {
  const sorted = sortOwnershipChildren([
    { ownerName: 'Chen, Nancy Y', percentage: '6%' },
    { ownerName: 'Chen, Jonson I', percentage: 27 },
    { ownerName: 'No other individual with 10% or more ownership int', ownershipPercentage: '40' },
    { ownerName: 'Chen, Alice T', percentage: '27%' },
  ]);

  assert.deepEqual(
    sorted.map((row) => row.ownerName),
    [
      'No other individual with 10% or more ownership int',
      'Chen, Alice T',
      'Chen, Jonson I',
      'Chen, Nancy Y',
    ]
  );
});

test('sorts terminated owners in with everyone by percent', () => {
  const sorted = sortOwnershipChildren([
    { ownerName: 'Active Small', percentage: 10, status: 'Active' },
    { ownerName: 'Terminated Large', percentage: 50, status: 'Terminated' },
    { ownerName: 'Active Mid', percentage: 25, status: 'Active' },
  ]);

  assert.deepEqual(
    sorted.map((row) => row.ownerName),
    ['Terminated Large', 'Active Mid', 'Active Small']
  );
});

test('keeps license nodes after owners, in their current order', () => {
  const sorted = sortOwnershipChildren([
    { ownerName: 'LIC-2', isLicenseNode: true },
    { ownerName: 'Small Owner', percentage: 5 },
    { ownerName: 'LIC-1', isLicenseNode: true },
    { ownerName: 'Large Owner', percentage: 80 },
    { ownerName: 'LIC-3', isLicenseNode: true },
  ]);

  assert.deepEqual(
    sorted.map((row) => row.ownerName),
    ['Large Owner', 'Small Owner', 'LIC-2', 'LIC-1', 'LIC-3']
  );
});

test('name ties ignore case and keep the original order when names match', () => {
  const sorted = sortOwnershipChildren([
    { ownerName: 'zeta holdings', percentage: 20, id: '1' },
    { ownerName: 'Alpha Co', percentage: 20, id: '2' },
    { ownerName: 'alpha co', percentage: 20, id: '3' },
  ]);

  assert.deepEqual(
    sorted.map((row) => row.id),
    ['2', '3', '1']
  );
});

test('does not mutate the source list', () => {
  const source = [
    { ownerName: 'B', percentage: 1 },
    { ownerName: 'A', percentage: 9 },
  ];
  const snapshot = source.map((row) => row.ownerName);
  sortOwnershipChildren(source);
  assert.deepEqual(source.map((row) => row.ownerName), snapshot);
});
