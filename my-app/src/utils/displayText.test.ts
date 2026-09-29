import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyIndividualNameCase, toProperCase } from './displayText.ts';
import { buildAddOwnerPayload, buildOwnerPayload } from './ownerPayload.ts';

test('toProperCase uppercases the first letter of each word and lowercases the rest', () => {
  assert.equal(toProperCase('john'), 'John');
  assert.equal(toProperCase('JOHN'), 'John');
  assert.equal(toProperCase('jOHN'), 'John');
  assert.equal(toProperCase('mary ann'), 'Mary Ann');
  assert.equal(toProperCase('mary-jane'), 'Mary-Jane');
  assert.equal(toProperCase("o'brien"), "O'Brien");
  assert.equal(toProperCase(''), '');
  assert.equal(toProperCase('  john  '), '  John  ');
});

test('applyIndividualNameCase changes individual names only', () => {
  const individual = applyIndividualNameCase({
    ownershipType: 'Individual',
    firstName: 'JOHN',
    middleInitial: 'a',
    lastName: 'DOE',
    ownerName: 'ACME',
  });
  assert.equal(individual.firstName, 'John');
  assert.equal(individual.middleInitial, 'A');
  assert.equal(individual.lastName, 'Doe');
  assert.equal(individual.ownerName, 'ACME');

  const organization = applyIndividualNameCase({
    ownershipType: 'Organization',
    ownerName: 'acme llc',
    firstName: 'JOHN',
    middleInitial: 'a',
    lastName: 'DOE',
  });
  assert.equal(organization.ownerName, 'acme llc');
  assert.equal(organization.firstName, 'JOHN');
  assert.equal(organization.middleInitial, 'a');
  assert.equal(organization.lastName, 'DOE');
  assert.equal(applyIndividualNameCase(organization), organization);
});

test('owner payloads proper-case individual names and leave organization names alone', () => {
  const individual = buildOwnerPayload({
    ownershipType: 'Individual',
    firstName: 'MARY ANN',
    middleInitial: "o'brien",
    lastName: 'DOE-SMITH',
    ownerName: 'SHOULD STAY',
  })[0];
  assert.equal(individual['First Name'], 'Mary Ann');
  assert.equal(individual['Middle Name'], "O'Brien");
  assert.equal(individual['Last Name'], 'Doe-Smith');
  assert.equal(individual['Entity Name'], 'SHOULD STAY');

  const organization = buildAddOwnerPayload({
    ownershipType: 'Organization',
    ownerName: 'acme llc',
    firstName: 'JOHN',
    lastName: 'DOE',
  })[0];
  assert.equal(organization['Entity Name'], 'acme llc');
  assert.equal(organization['First Name'], 'JOHN');
  assert.equal(organization['Last Name'], 'DOE');
});

test('applyIndividualNameCase leaves an already proper-cased individual unchanged', () => {
  const form = {
    ownershipType: 'individual',
    firstName: 'John',
    middleInitial: 'A',
    lastName: 'Doe',
  };
  assert.equal(applyIndividualNameCase(form), form);
});
