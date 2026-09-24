import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachRootLicensesFromReverse,
  collectLicenseDetails,
  displayedLicenses,
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

test('childReferenceId matching the viewed contact does not hide reverse parents', () => {
  const { parentRows, rootLicenses } = attachRootLicensesFromReverse(
    [
      {
        childReferenceId: '246272',
        referenceNbr: '999001',
        ownerName: 'Parent Org',
        licenseAltId: 'LIC-PARENT',
        pendingApplications: [{ applicationAltId: 'APP-1', applicationType: 'Tavern' }],
      },
    ],
    '246272'
  );

  assert.equal(parentRows.length, 1);
  assert.equal(parentRows[0].referenceNbr, '999001');
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

test('a contact with owners still keeps every license on its own row', () => {
  const { parentRows, rootLicenses } = attachRootLicensesFromReverse(
    [
      {
        childReferenceId: '248596',
        referenceNbr: '111',
        ownerName: 'Holding Co',
        licenseAltId: 'LIC-PARENT',
      },
      {
        childReferenceId: '248596',
        referenceNbr: '248596',
        ownerName: "Steve's Best Supper Club Ever",
        licenseAltId: 'SUP301-0000100',
        licenseType: 'Supper Club',
        _licenses: [
          { licenseAltId: 'SUP301-0000100', licenseType: 'Supper Club' },
          { licenseAltId: 'LIQ303-0000612', licenseType: 'Liquor' },
        ],
      },
    ],
    '248596'
  );

  assert.equal(parentRows.length, 1);
  assert.equal(parentRows[0].referenceNbr, '111');
  assert.equal(rootLicenses.length, 2);
  assert.equal(rootLicenses.some((lic) => lic.altId === 'LIQ303-0000612'), true);
  assert.equal(rootLicenses.some((lic) => lic.altId === 'SUP301-0000100'), true);
});

test('admin support licenses in the script payload are drawn with the rest', () => {
  const row = {
    referenceNbr: '248596',
    ownerName: 'NVOneTime',
    licenseAltId: 'ACC101-0000543',
    licenseType: 'Food Caterer',
    _licenses: [
      { licenseAltId: 'ACC101-0000543', licenseType: 'Food Caterer' },
      { licenseAltId: 'ENT105-0000419', licenseType: 'Bowling Alley' },
      { licenseAltId: 'ADM101-0000354', licenseType: 'Administrative Office Space' },
      { licenseAltId: 'ADM101-0000356', licenseType: 'Administrative Office Space' },
      { licenseAltId: 'ADM101-0000358', licenseType: 'Administrative Office Space' },
    ],
  };

  const shown = displayedLicenses({ referenceNbr: '248596', ownerName: 'NVOneTime' }, [row]);
  assert.equal(shown.has('ADM101-0000354'), true);
  assert.equal(shown.has('ADM101-0000356'), true);
  assert.equal(shown.has('ADM101-0000358'), true);
  assert.equal(shown.get('ADM101-0000354')?.licenseType, 'Administrative Office Space');
});

test('portal reads the licenses list Accela keeps, not only licenseAltId', () => {
  const contact = {
    referenceNbr: '248596',
    ownerName: 'NVOneTime',
    licenseAltId: 'ACC101-0000543',
    licenseType: 'Food Caterer',
    licenses: [
      { licenseAltId: 'ACC101-0000543', licenseType: 'Food Caterer' },
      { licenseAltId: 'ENT105-0000419', licenseType: 'Bowling Alley' },
      { licenseAltId: 'RTL205-0000319', licenseType: 'Secondhand Dealer Class IV (Used Motor Vehicles)' },
      { licenseAltId: 'TRN116-0000389', licenseType: 'Taxicab Company' },
    ],
  };

  const { parentRows, rootLicenses } = attachRootLicensesFromReverse([contact], '248596');
  assert.deepEqual(parentRows, []);
  assert.equal(rootLicenses.length, 4);
  assert.equal(rootLicenses.some((lic) => lic.altId === 'ENT105-0000419'), true);
  assert.equal(rootLicenses.some((lic) => lic.altId === 'TRN116-0000389'), true);

  const details = collectLicenseDetails(contact);
  assert.equal(details.size, 4);
});

test('one contact keeps every license the script sends in _licenses', () => {
  const contact = {
    referenceNbr: '248593',
    ownerName: "Steve's Best Supper Club Ever",
    licenseAltId: 'SUP301-0000100',
    licenseType: 'Supper Club',
    businessName: "Steve's Best Supper Club Ever",
    _licenses: [
      {
        licenseAltId: 'SUP301-0000100',
        licenseType: 'Supper Club',
        businessName: "Steve's Best Supper Club Ever",
      },
      {
        licenseAltId: 'LIQ303-0000612',
        licenseType: 'Liquor',
        businessName: "Steve's Best Supper Club Ever",
      },
    ],
  };

  const details = collectLicenseDetails(contact);
  assert.equal(details.size, 2);
  assert.equal(details.get('SUP301-0000100')?.licenseType, 'Supper Club');
  assert.equal(details.get('LIQ303-0000612')?.licenseType, 'Liquor');

  const { parentRows, rootLicenses } = attachRootLicensesFromReverse([contact], '248593');
  assert.deepEqual(parentRows, []);
  assert.equal(rootLicenses.length, 2);
  assert.equal(rootLicenses.some((lic) => lic.altId === 'LIQ303-0000612'), true);

  const merged = dedupeReverseContactNodes([
    {
      referenceNbr: '10',
      ownerName: 'Holding Co',
      relatedContacts: [contact],
    },
  ]);
  const nested = collectLicenseDetails(merged[0].relatedContacts[0]);
  assert.equal(nested.size, 2);
  assert.equal(nested.has('LIQ303-0000612'), true);
});

test('gaming children stay on the license they belong to when a contact has several', () => {
  const contact = {
    referenceNbr: '248593',
    licenseAltId: 'SUP301-0000100',
    licenseType: 'Supper Club',
    _licenses: [
      { licenseAltId: 'SUP301-0000100', licenseType: 'Supper Club' },
      {
        licenseAltId: 'GAM301-0000241',
        licenseType: 'Gaming - Resort Hotel',
        childLicenses: [{ licenseAltId: 'CON301-0000241', licenseType: 'Concession' }],
      },
    ],
  };

  const details = collectLicenseDetails(contact);
  assert.equal(details.size, 2);
  assert.equal(details.get('SUP301-0000100')?.childLicenses, undefined);
  assert.equal(details.get('GAM301-0000241')?.childLicenses?.[0].altId, 'CON301-0000241');
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

test('temporary permits become separate Permit Record nodes', () => {
  const details = collectLicenseDetails({
    licenseAltId: 'LIC-1001',
    licenseType: 'Tavern',
    pendingApplications: [
      {
        applicationAltId: 'TEM120-0000146P',
        applicationType: 'Temporary Permit',
        businessName: 'NV TEST',
        applicationStatus: 'Issued',
        locationAddress: 'NELLIS',
        isPermit: true,
      },
    ],
  });

  assert.equal(details.size, 2);
  assert.equal(details.get('LIC-1001')?.isPermit, false);
  assert.equal(details.get('TEM120-0000146P')?.isPermit, true);
  assert.equal(details.get('TEM120-0000146P')?.isPendingApplication, false);
  assert.equal(details.get('TEM120-0000146P')?.licenseType, 'Temporary Permit');
  assert.equal(details.get('TEM120-0000146P')?.applicationStatus, 'Issued');

  const permitRec = details.get('TEM120-0000146P');
  assert.ok(permitRec);
  const permitNode = licenseRecordNode(permitRec);
  assert.equal(permitNode.isLicenseNode, true);
  assert.equal(permitNode.isPermit, true);
  assert.equal(permitNode.contactType, 'Permit Record');
  assert.equal(permitNode.ownershipType, 'Permit');
  assert.equal(permitNode.ownerName, 'TEM120-0000146P');
});

test('self reverse rows keep temporary permits on the root', () => {
  const { rootLicenses, parentRows } = attachRootLicensesFromReverse(
    [
      {
        referenceNbr: '248593',
        ownerName: 'RL TEST',
        licenseAltId: 'LIC-1001',
        pendingApplications: [{ applicationAltId: 'TEM120-0000146P', applicationType: 'Temporary Permit', isPermit: true }],
      },
    ],
    '248593'
  );

  assert.equal(parentRows.length, 0);
  assert.equal(rootLicenses.length, 2);
  assert.equal(rootLicenses.some((lic) => lic.altId === 'TEM120-0000146P' && lic.isPermit), true);
});

test('dedupe merges temporary permits onto the reverse contact node', () => {
  const merged = dedupeReverseContactNodes([
    { referenceNbr: '10', ownerName: 'NV TEST' },
    {
      referenceNbr: '10',
      ownerName: 'NV TEST',
      pendingApplications: [{ applicationAltId: 'TEM120-0000146P', applicationType: 'Temporary Permit', isPermit: true }],
    },
  ]);

  assert.equal(merged.length, 1);
  const details = collectLicenseDetails(merged[0]);
  assert.equal(details.get('TEM120-0000146P')?.isPermit, true);
  assert.equal(details.get('TEM120-0000146P')?.licenseType, 'Temporary Permit');
});
