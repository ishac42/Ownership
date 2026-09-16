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
    if (!map.has(key)) map.set(key, row);
  });
  return Array.from(map.values());
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
