import { applyIndividualNameCase, isIndividualOwner } from './displayText';
import {
  insertOwnerUnderParent,
  patchOwnerInTree,
  referenceFromAddResponse,
  removeOwnerFromParent,
  stripOwnerPatchUpdates,
} from './ownershipPatch.js';

export {
  insertOwnerUnderParent,
  patchOwnerInTree,
  referenceFromAddResponse,
  removeOwnerFromParent,
  stripOwnerPatchUpdates,
};

/** Contact reference on a raw owner node from the retrieve-info script. */
export const ownerReferenceOf = (item: unknown): string => {
  const node = item as Record<string, unknown> | null | undefined;
  return String(node?.referenceNbr || node?.referenceNumber || node?.id || '').trim();
};

/** Owner whose reference is the hierarchy that was searched, when the script returns more than one. */
export const findOwnerByReference = (owners: unknown[], ref: string): unknown | null => {
  const target = String(ref || '').trim();
  if (!target || target === 'N/A') return null;
  return owners.find((item) => ownerReferenceOf(item) === target) ?? null;
};

/** Normalize ref + parent on raw API nodes before filter/display. */
export const prepareOwnershipChild = (
  child: Record<string, unknown>,
  parentRefNbr?: string
): Record<string, unknown> => ({
  ...child,
  referenceNbr: child.referenceNbr || child.referenceNumber || child.id || '',
  referenceNumber: child.referenceNumber || child.referenceNbr || child.id || '',
  parentRefNbr: child.parentRefNbr || parentRefNbr || '',
});

export const prepareOwnershipChildren = (
  children: unknown[],
  parentRefNbr?: string
): Record<string, unknown>[] =>
  (children || []).map((child) =>
    prepareOwnershipChild(child as Record<string, unknown>, parentRefNbr)
  );

/** Apply all pending owner edits onto a tree (survives API refresh + modal reopen). */
export const applyAllOwnerPatches = <T>(
  node: T,
  patches: Record<string, Record<string, unknown>>
): T => {
  if (!node || Object.keys(patches).length === 0) return node;

  let result: unknown = node;
  for (const [refNbr, updates] of Object.entries(patches)) {
    result = patchOwnerInTree(result, refNbr, updates);
  }
  return result as T;
};

/** Chart node for an owner that was just created. Fields come from the form, not a refetch. */
export const addedOwnerNode = (
  formData: Record<string, unknown>,
  parentRef: string,
  referenceNbr: string
): Record<string, unknown> => {
  const names = applyIndividualNameCase(formData);
  const individual = isIndividualOwner(formData.ownershipType);
  const firstName = String(names.firstName || '');
  const lastName = String(names.lastName || '');
  const ownerName = individual
    ? [firstName, lastName].filter(Boolean).join(' ')
    : String(formData.ownerName || '');

  return {
    referenceNbr,
    referenceNumber: referenceNbr,
    id: referenceNbr,
    parentRefNbr: parentRef,
    ownerName,
    firstName,
    lastName,
    ownershipType: formData.ownershipType || '',
    contactType: individual ? 'Individual' : String(formData.ownershipType || 'Organization'),
    type: formData.type || 'Owner',
    percentage: formData.percentage ?? '',
    status: formData.status || 'Active',
    email: formData.email || '',
    phone: formData.phone || '',
    ownershipAddr: formData.ownershipAddr || '',
    city: formData.city || '',
    state: formData.state || '',
    zip: formData.zip || '',
    country: formData.country || '',
    relatedContacts: [],
  };
};

/** Field edits only. The cached patch must not carry the contact's subtree. */
export const buildSavedOwnerUpdates = (
  data: Record<string, unknown>,
  status: string
): Record<string, unknown> => stripOwnerPatchUpdates({
  ...data,
  status,
  ownershipPercentage: data.percentage,
  contactAddress: data.ownershipAddr || data.contactAddress,
});
