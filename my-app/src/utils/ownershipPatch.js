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

const ownerRefOf = (node) =>
  String(node?.referenceNbr || node?.referenceNumber || node?.id || '');

/** Read the new contact reference from an add-owner API body. */
export const referenceFromAddResponse = (body) => {
  const layers = [
    body?.data?.result?.result,
    body?.data?.result,
    body?.result?.result,
    body?.result,
    body?.data,
    body,
  ];
  for (const layer of layers) {
    const ref = String(layer?.referenceNbr ?? layer?.referenceNumber ?? '').trim();
    if (ref && ref.toLowerCase() !== 'null' && ref.toLowerCase() !== 'undefined') return ref;
  }
  return '';
};

/** Place a new owner under a parent. The same reference is not added twice. */
export const insertOwnerUnderParent = (node, parentRef, child) => {
  if (!node || typeof node !== 'object') return node;
  const parent = String(parentRef || '');
  if (!parent) return node;

  const children = Array.isArray(node.relatedContacts) ? node.relatedContacts : null;
  const mapped = children
    ? children.map((row) => insertOwnerUnderParent(row, parentRef, child))
    : null;

  if (ownerRefOf(node) !== parent) {
    if (!mapped) return node;
    const changed = mapped.some((row, index) => row !== children[index]);
    return changed ? { ...node, relatedContacts: mapped } : node;
  }

  const existing = mapped || [];
  const childRef = ownerRefOf(child);
  if (childRef && existing.some((row) => ownerRefOf(row) === childRef)) {
    const changed = children
      ? existing.some((row, index) => row !== children[index])
      : existing.length > 0;
    return changed ? { ...node, relatedContacts: existing } : node;
  }

  const fields = stripOwnerPatchUpdates(child);
  return {
    ...node,
    relatedContacts: [
      ...existing,
      {
        ...fields,
        referenceNbr: childRef,
        referenceNumber: child?.referenceNumber || childRef,
        parentRefNbr: parent,
        relatedContacts: [],
      },
    ],
  };
};

/** Drop one child from a parent. Other copies of that contact stay. */
export const removeOwnerFromParent = (node, parentRef, childRef) => {
  if (!node || typeof node !== 'object') return node;
  const parent = String(parentRef || '');
  const childId = String(childRef || '');
  if (!parent || !childId) return node;

  const children = Array.isArray(node.relatedContacts) ? node.relatedContacts : null;
  if (!children) return node;

  const recursed = children.map((row) => removeOwnerFromParent(row, parentRef, childRef));
  const next = ownerRefOf(node) === parent
    ? recursed.filter((row) => ownerRefOf(row) !== childId)
    : recursed;
  const changed = next.length !== children.length || next.some((row, index) => row !== children[index]);
  return changed ? { ...node, relatedContacts: next } : node;
};
