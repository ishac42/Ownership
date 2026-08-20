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

/** Deep-patch a node (and descendants) by reference number. */
export const patchOwnerInTree = (
  node: unknown,
  refNbr: string,
  updates: Record<string, unknown>
): unknown => {
  if (!node || typeof node !== 'object') return node;

  const record = node as Record<string, unknown>;
  const nodeRef = String(record.referenceNbr || record.referenceNumber || record.id || '');
  let patched: Record<string, unknown> =
    nodeRef === String(refNbr) ? { ...record, ...updates } : record;

  if (Array.isArray(patched.relatedContacts)) {
    patched = {
      ...patched,
      relatedContacts: patched.relatedContacts.map((child) =>
        patchOwnerInTree(child, refNbr, updates)
      ),
    };
  }

  return patched;
};

/** Apply all pending owner edits onto a tree (survives API refresh + modal reopen). */
export const applyAllOwnerPatches = (
  node: unknown,
  patches: Record<string, Record<string, unknown>>
): unknown => {
  if (!node || Object.keys(patches).length === 0) return node;

  let result: unknown = node;
  for (const [refNbr, updates] of Object.entries(patches)) {
    result = patchOwnerInTree(result, refNbr, updates);
  }
  return result;
};

/** Normalize saved form values for display + tree patching. */
export const buildSavedOwnerUpdates = (
  data: Record<string, unknown>,
  status: string
): Record<string, unknown> => ({
  ...data,
  status,
  ownershipPercentage: data.percentage,
  contactAddress: data.ownershipAddr || data.contactAddress,
});
