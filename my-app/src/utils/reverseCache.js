import { patchOwnerInTree } from './ownershipPatch.js';

/**
 * Run a tree change on every cached reverse row.
 * @returns {Record<string, any[]>}
 */
export const mapReverseRelationTrees = (cache = {}, transform) => {
  /** @type {Record<string, any[]>} */
  const next = {};
  for (const [ref, rows] of Object.entries(cache || {})) {
    next[ref] = (Array.isArray(rows) ? rows : []).map((row) => transform(row));
  }
  return next;
};

const firstId = (value) => {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null') return '';
  return text;
};

/** All searched-child refs this reverse parent belongs to. */
export const childReferenceIdsOf = (item) => {
  const ids = [];
  const seen = new Set();
  const add = (value) => {
    const key = firstId(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    ids.push(key);
  };

  if (!item || typeof item !== 'object') return ids;

  add(item.childReferenceId);
  add(item.ChildReferenceID);
  add(item.childRefNo);
  if (Array.isArray(item.childReferenceIds)) {
    item.childReferenceIds.forEach(add);
  }

  const path = String(item.hierarchyPath ?? '');
  if (path.includes('>')) add(path.split('>')[0]);

  // Accela tags childReferenceId as the owner that was searched, while
  // referenceNbr is the contact on the row (often the operating entity).
  // Related-licenses for that entity must still see this row so its
  // licenses are not dropped (N0921010 / TEST OWN).
  add(item.referenceNbr);
  add(item.referenceNumber);

  return ids;
};

export const groupReverseParentsByChildRef = (rows) => {
  const cacheMap = {};
  (Array.isArray(rows) ? rows : []).forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const keys = childReferenceIdsOf(item);
    keys.forEach((key) => {
      if (!cacheMap[key]) cacheMap[key] = [];
      cacheMap[key].push(item);
    });
  });
  return cacheMap;
};

const rowKey = (row, fallback) =>
  firstId(row?.referenceNbr) || firstId(row?.referenceNumber) || fallback;

const unionByReference = (existingRows, incomingRows) => {
  const map = new Map();
  existingRows.forEach((row, index) => {
    map.set(rowKey(row, `existing-${index}`), row);
  });
  incomingRows.forEach((row, index) => {
    const key = rowKey(row, `incoming-${index}`);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      return;
    }
    // Same contact came back from Accela. Keep one row and take the fresh fields.
    map.set(key, {
      ...existing,
      ...row,
      relatedContacts: row.relatedContacts ?? existing.relatedContacts,
    });
  });
  return Array.from(map.values());
};

/** Apply field edits to every cached reverse row without adding a second contact. */
export const patchReverseRelationCache = (cache = {}, patches = {}) => {
  const entries = Object.entries(patches || {});
  if (entries.length === 0) return cache || {};

  const next = {};
  for (const [ref, rows] of Object.entries(cache || {})) {
    let list = Array.isArray(rows) ? rows : [];
    for (const [refNbr, updates] of entries) {
      list = list.map((row) => patchOwnerInTree(row, refNbr, updates));
    }
    next[ref] = list;
  }
  return next;
};

/** Replace the requested contacts' reverse rows with a fresh fetch, including an empty list. */
export const replaceReverseRelationCache = (cache = {}, incoming = {}) => {
  const next = { ...(cache || {}) };
  Object.entries(incoming || {}).forEach(([ref, rows]) => {
    next[ref] = Array.isArray(rows) ? rows : [];
  });
  return next;
};

/**
 * Merge a reverse-relation fetch into the per-contact cache.
 * Never replace rows the user can already see with an empty result.
 */
export const mergeReverseRelationCache = (prev = {}, incoming = {}) => {
  const next = { ...prev };

  Object.entries(incoming || {}).forEach(([ref, rows]) => {
    const incomingRows = Array.isArray(rows) ? rows : [];
    const existingRows = Array.isArray(prev?.[ref]) ? prev[ref] : undefined;

    if (incomingRows.length === 0) {
      if (existingRows && existingRows.length > 0) return;
      next[ref] = existingRows ?? [];
      return;
    }

    if (!existingRows || existingRows.length === 0) {
      next[ref] = incomingRows;
      return;
    }

    next[ref] = unionByReference(existingRows, incomingRows);
  });

  return next;
};
