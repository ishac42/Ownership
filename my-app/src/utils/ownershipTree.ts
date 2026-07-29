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

/** Deep-patch a node (and its relatedContacts) by reference number. */
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

  const children = patched.relatedContacts;
  if (Array.isArray(children)) {
    patched = {
      ...patched,
      relatedContacts: children.map((child) => patchOwnerInTree(child, refNbr, updates)),
    };
  }

  return patched;
};
