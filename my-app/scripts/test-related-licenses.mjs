import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachRootLicensesFromReverse,
  collectLicenseDetails,
  licenseRecordNode,
  relatedLicenseFromItem,
  upsertRelatedLicense,
  dedupeReverseContactNodes,
} from '../src/utils/relatedLicenses.ts';

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

test('gaming child licenses stay nested on the parent license', () => {
  const rec = relatedLicenseFromItem({
    licenseAltId: 'GAM301-0000241',
    licenseType: 'Gaming - Resort Hotel',
    businessName: 'RL TEST',
    locationAddress: 'Strip',
    childLicenses: [
      {
        licenseAltId: 'CON301-0000241',
        licenseType: 'Concession',
        businessName: 'RL TEST BAR',
        locationAddress: 'Casino floor',
      },
    ],
  });

  assert.equal(rec?.altId, 'GAM301-0000241');
  assert.equal(rec?.childLicenses?.length, 1);
  assert.equal(rec?.childLicenses?.[0].altId, 'CON301-0000241');
  assert.equal(rec?.childLicenses?.[0].licenseType, 'Concession');

  const details = collectLicenseDetails({
    licenseAltId: 'GAM301-0000241',
    licenseType: 'Gaming - Resort Hotel',
    childLicenses: [
      { licenseAltId: 'CON301-0000241', licenseType: 'Concession' },
    ],
  });
  assert.equal(details.size, 1);
  assert.equal(details.has('CON301-0000241'), false);
  assert.equal(details.get('GAM301-0000241')?.childLicenses?.[0].altId, 'CON301-0000241');

  const merged = [];
  upsertRelatedLicense(merged, rec);
  upsertRelatedLicense(merged, {
    altId: 'GAM301-0000241',
    licenseType: '',
    businessName: '',
    locationAddress: '',
    childLicenses: [
      { altId: 'CON301-0000242', licenseType: 'Other', businessName: '', locationAddress: '' },
    ],
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].childLicenses?.length, 2);

  const node = licenseRecordNode(rec);
  assert.equal(node.isLicenseNode, true);
  assert.equal(node.ownerName, 'GAM301-0000241');
  assert.equal(node.relatedContacts.length, 1);
  assert.equal(node.relatedContacts[0].ownerName, 'CON301-0000241');
  assert.equal(node.relatedContacts[0].isLicenseNode, true);
});

test('self reverse rows keep nested gaming children', () => {
  const { rootLicenses } = attachRootLicensesFromReverse(
    [
      {
        referenceNbr: '248594',
        licenseAltId: 'GAM301-0000241',
        childLicenses: [{ licenseAltId: 'CON301-0000241', licenseType: 'Concession' }],
      },
    ],
    '248594'
  );

  assert.equal(rootLicenses.length, 1);
  assert.equal(rootLicenses[0].childLicenses?.[0].altId, 'CON301-0000241');
});

test('duplicate reverse contacts with the same ref collapse to one node', () => {
  const merged = dedupeReverseContactNodes([
    {
      referenceNbr: '10',
      ownerName: 'LV RESORTS',
      relatedContacts: [
        { referenceNbr: '99', ownerName: 'RL TEST' },
        {
          referenceNbr: '99',
          ownerName: 'RL TEST',
          licenseAltId: 'GAM301-0000241',
          licenseType: 'Gaming - Resort Hotel',
          childLicenses: [{ licenseAltId: 'CON301-0000241', licenseType: 'Concession' }],
        },
      ],
    },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].relatedContacts.length, 1);
  assert.equal(merged[0].relatedContacts[0].ownerName, 'RL TEST');
  assert.equal(merged[0].relatedContacts[0].licenseAltId, 'GAM301-0000241');

  const details = collectLicenseDetails(merged[0].relatedContacts[0]);
  assert.equal(details.size, 1);
  assert.equal(details.get('GAM301-0000241')?.childLicenses?.[0].altId, 'CON301-0000241');
});
