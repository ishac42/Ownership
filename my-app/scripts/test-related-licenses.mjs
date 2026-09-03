import assert from 'node:assert/strict';
import test from 'node:test';
import { attachRootLicensesFromReverse } from '../src/utils/relatedLicenses.ts';

test('self reverse rows become root licenses when there is no hierarchy', () => {
  const { parentRows, rootLicenses } = attachRootLicensesFromReverse(
    [
      {
        referenceNbr: '248593',
        ownerName: 'RL TEST',
        licenseAltId: 'LIC-1001',
        licenseType: 'Tavern',
        businessName: 'RL TEST',
        locationAddress: 'NELLIS',
      },
      {
        referenceNbr: '248593',
        ownerName: 'RL TEST',
        licenseAltId: 'LIC-1002',
        licenseType: 'Restaurant',
      },
    ],
    '248593'
  );

  assert.deepEqual(parentRows, []);
  assert.equal(rootLicenses.length, 2);
  assert.equal(rootLicenses[0].altId, 'LIC-1001');
  assert.equal(rootLicenses[1].altId, 'LIC-1002');
});

test('true reverse parents stay as parent rows', () => {
  const { parentRows, rootLicenses } = attachRootLicensesFromReverse(
    [
      {
        childReferenceId: '248593',
        referenceNbr: '111',
        ownerName: 'Holding Co',
        licenseAltId: 'LIC-9',
      },
    ],
    '248593'
  );

  assert.equal(parentRows.length, 1);
  assert.equal(parentRows[0].referenceNbr, '111');
  assert.equal(rootLicenses.length, 0);
});
