export type RelatedLicense = {
  altId: string;
  licenseType: string;
  businessName: string;
  locationAddress: string;
  childLicenses?: RelatedLicense[];
};

const blankDetails = (): Omit<RelatedLicense, 'altId' | 'childLicenses'> => ({
  licenseType: '',
  businessName: '',
  locationAddress: '',
});

const firstNonEmpty = (...values: unknown[]): string => {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text && text !== 'null') return text;
  }
  return '';
};

const parseChildLicenses = (value: unknown): RelatedLicense[] => {
  if (!Array.isArray(value)) return [];
  const list: RelatedLicense[] = [];
  value.forEach((entry) => {
    upsertRelatedLicense(list, asRelatedLicense(entry));
  });
  return list;
};

const mergeRelatedLicense = (
  rec: RelatedLicense,
  existing?: RelatedLicense
): RelatedLicense => {
  const childLicenses: RelatedLicense[] = [];
  (existing?.childLicenses ?? []).forEach((child) => upsertRelatedLicense(childLicenses, child));
  (rec.childLicenses ?? []).forEach((child) => upsertRelatedLicense(childLicenses, child));

  return {
    altId: rec.altId,
    licenseType: rec.licenseType || existing?.licenseType || '',
    businessName: rec.businessName || existing?.businessName || '',
    locationAddress: rec.locationAddress || existing?.locationAddress || '',
    ...(childLicenses.length > 0 ? { childLicenses } : {}),
  };
};

export const relatedLicenseFromItem = (
  item: Record<string, unknown> | null | undefined
): RelatedLicense | null => {
  if (!item) return null;
  const altId = firstNonEmpty(
    item.licenseAltId,
    item.LICENSEALTID,
    item.licensesAltId,
    item.altId
  );
  if (!altId) return null;
  return mergeRelatedLicense({
    altId,
    licenseType: firstNonEmpty(item.licenseType, item.LICENSETYPE),
    businessName: firstNonEmpty(item.businessName, item.BUSINESSNAME),
    locationAddress: firstNonEmpty(item.locationAddress, item.LOCATIONADDRESS),
    childLicenses: parseChildLicenses(item.childLicenses),
  });
};

export const asRelatedLicense = (lic: unknown): RelatedLicense | null => {
  if (lic == null || lic === '') return null;
  if (typeof lic === 'string') {
    const altId = lic.trim();
    if (!altId || altId === '[object Object]') return null;
    return { altId, ...blankDetails() };
  }
  if (typeof lic === 'object') {
    return relatedLicenseFromItem(lic as Record<string, unknown>);
  }
  return null;
};

export const upsertRelatedLicense = (
  list: RelatedLicense[],
  rec: RelatedLicense | null
): RelatedLicense[] => {
  if (!rec?.altId) return list;
  const existingIndex = list.findIndex((entry) => entry.altId === rec.altId);
  if (existingIndex === -1) {
    list.push(mergeRelatedLicense(rec));
    return list;
  }
  list[existingIndex] = mergeRelatedLicense(rec, list[existingIndex]);
  return list;
};

export const licenseRecordNode = (rec: RelatedLicense): Record<string, unknown> => ({
  ownerName: rec.altId,
  contactType: 'License Record',
  ownershipType: 'License',
  isLicenseNode: true,
  referenceNbr: `lic-${rec.altId}`,
  licenseType: rec.licenseType,
  businessName: rec.businessName,
  locationAddress: rec.locationAddress,
  relatedContacts: (rec.childLicenses ?? []).map(licenseRecordNode),
});

/**
 * Reverse rows whose contact ref is the entity being viewed are not parents.
 * They are fallback license hits for that same contact (no ownership hierarchy).
 */
export const attachRootLicensesFromReverse = (
  reverseData: unknown[] | null | undefined,
  rootRef: string
): { parentRows: Record<string, unknown>[]; rootLicenses: RelatedLicense[] } => {
  const parentRows: Record<string, unknown>[] = [];
  const rootLicenses: RelatedLicense[] = [];
  const normalizedRoot = String(rootRef || '').trim();

  if (!Array.isArray(reverseData)) {
    return { parentRows, rootLicenses };
  }

  reverseData.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const item = raw as Record<string, unknown>;
    const itemRef = firstNonEmpty(item.referenceNbr, item.referenceNumber);
    const isSelf = normalizedRoot !== '' && itemRef === normalizedRoot;

    if (isSelf) {
      upsertRelatedLicense(rootLicenses, relatedLicenseFromItem(item));
      return;
    }
    parentRows.push(item);
  });

  return { parentRows, rootLicenses };
};

const FILL_IF_EMPTY_KEYS = [
  'percentage',
  'percentOwned',
  'licenseAltId',
  'licenseType',
  'businessName',
  'locationAddress',
  'contactType',
  'ownershipType',
  'email',
  'phone',
  'nvBusinessId',
] as const;

/**
 * Collapse reverse-relation rows that are the same contact (same reference)
 * into one node, combining licenses and nested relatedContacts.
 */
export const dedupeReverseContactNodes = (
  rows: unknown[] | null | undefined
): Record<string, unknown>[] => {
  const map = new Map<string, Record<string, unknown>>();
  let anon = 0;

  (Array.isArray(rows) ? rows : []).forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const source = raw as Record<string, unknown>;
    const incoming: Record<string, unknown> = {
      ...source,
      relatedContacts: dedupeReverseContactNodes(source.relatedContacts as unknown[]),
    };

    const licenses: RelatedLicense[] = [];
    if (Array.isArray(incoming._licenses)) {
      incoming._licenses.forEach((lic) => upsertRelatedLicense(licenses, asRelatedLicense(lic)));
    }
    upsertRelatedLicense(licenses, relatedLicenseFromItem(incoming));
    incoming._licenses = licenses;

    const key =
      firstNonEmpty(incoming.referenceNbr, incoming.referenceNumber) || `anon-${anon++}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, incoming);
      return;
    }

    const mergedLicenses: RelatedLicense[] = [];
    (Array.isArray(existing._licenses) ? existing._licenses : []).forEach((lic) =>
      upsertRelatedLicense(mergedLicenses, asRelatedLicense(lic))
    );
    licenses.forEach((lic) => upsertRelatedLicense(mergedLicenses, lic));
    existing._licenses = mergedLicenses;

    FILL_IF_EMPTY_KEYS.forEach((field) => {
      if (!firstNonEmpty(existing[field]) && firstNonEmpty(incoming[field])) {
        existing[field] = incoming[field];
      }
    });

    existing.relatedContacts = dedupeReverseContactNodes([
      ...((existing.relatedContacts as unknown[]) || []),
      ...((incoming.relatedContacts as unknown[]) || []),
    ]);
  });

  return Array.from(map.values());
};

export const collectLicenseDetails = (
  entity: {
    _licenses?: unknown[];
    licenseAltId?: string;
    LICENSESALTID?: string;
    licensesAltId?: string;
    childLicenses?: unknown[];
  } | null,
  normalizedLicenseAltId?: string
): Map<string, RelatedLicense> => {
  const map = new Map<string, RelatedLicense>();

  const add = (rec: RelatedLicense | null) => {
    if (!rec) return;
    const existing = map.get(rec.altId);
    map.set(rec.altId, mergeRelatedLicense(rec, existing));
  };

  add(relatedLicenseFromItem(entity as Record<string, unknown>));

  if (Array.isArray(entity?._licenses)) {
    entity._licenses.forEach((lic) => add(asRelatedLicense(lic)));
  }

  [entity?.licenseAltId, entity?.LICENSESALTID, entity?.licensesAltId, normalizedLicenseAltId].forEach(
    (field) => {
      if (typeof field === 'string' && field.trim() !== '') {
        field.split(/[\s,;]+/).forEach((lic) => add(asRelatedLicense(lic)));
      }
    }
  );

  return map;
};
