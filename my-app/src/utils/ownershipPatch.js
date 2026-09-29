/** Nested trees and license bags stay on the live node. Caching them duplicates the contact. */
const PATCH_STRUCTURAL_KEYS = [
  'relatedContacts',
  'parents',
  '_licenses',
  'licenses',
  'childLicenses',
];

export const stripOwnerPatchUpdates = (updates) => {
  const next = { ...(updates || {}) };
  for (const key of PATCH_STRUCTURAL_KEYS) delete next[key];
  return next;
};

/** Deep-patch a node (and descendants) by reference number. */
export const patchOwnerInTree = (node, refNbr, updates) => {
  if (!node || typeof node !== 'object') return node;

  const nodeRef = String(node.referenceNbr || node.referenceNumber || node.id || '');
  const fieldUpdates = stripOwnerPatchUpdates(updates);
  let patched = nodeRef === String(refNbr) ? { ...node, ...fieldUpdates } : node;

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
