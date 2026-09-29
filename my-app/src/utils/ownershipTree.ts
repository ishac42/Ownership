import { patchOwnerInTree, stripOwnerPatchUpdates } from './ownershipPatch.js';

export { patchOwnerInTree, stripOwnerPatchUpdates };

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
