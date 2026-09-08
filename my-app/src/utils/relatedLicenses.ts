export type RelatedLicense = {
  altId: string;
  licenseType: string;
  businessName: string;
  locationAddress: string;
  isPendingApplication?: boolean;
  applicationStatus?: string;
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
    isPendingApplication: rec.isPendingApplication || existing?.isPendingApplication || false,
    applicationStatus: rec.applicationStatus || existing?.applicationStatus || '',
    ...(childLicenses.length > 0 ? { childLicenses } : {}),
  };
};

export const pendingApplicationToRelatedLicense = (
  app: Record<string, unknown> | null | undefined
): RelatedLicense | null => {
  if (!app) return null;
  const altId = firstNonEmpty(app.applicationAltId, app.APPLICATIONALTID);
  if (!altId) return null;
  return {
    altId,
    licenseType: firstNonEmpty(app.applicationType, app.APPLICATIONTYPE),
    businessName: firstNonEmpty(app.businessName, app.BUSINESSNAME),
    locationAddress: firstNonEmpty(app.locationAddress, app.LOCATIONADDRESS),
    isPendingApplication: true,
    applicationStatus: firstNonEmpty(app.applicationStatus, app.APPLICATIONSTATUS),
  };
};

const collectPendingApplications = (
  entity: Record<string, unknown> | null | undefined,
  add: (rec: RelatedLicense | null) => void
) => {
  if (!Array.isArray(entity?.pendingApplications)) return;
  entity.pendingApplications.forEach((app) =>
    add(pendingApplicationToRelatedLicense(app as Record<string, unknown>))
  );
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
    isPendingApplication: item.isPendingApplication === true || item.isPendingApplication === 'true',
    applicationStatus: firstNonEmpty(item.applicationStatus, item.APPLSTATUS),
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
  contactType: rec.isPendingApplication ? 'Application Record' : 'License Record',
  ownershipType: rec.isPendingApplication ? 'Application' : 'License',
  isLicenseNode: true,
  isPendingApplication: Boolean(rec.isPendingApplication),
  applicationStatus: rec.applicationStatus || '',
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
      if (Array.isArray(item._licenses)) {
        item._licenses.forEach((lic) => upsertRelatedLicense(rootLicenses, asRelatedLicense(lic)));
      }
      collectPendingApplications(item, (rec) => upsertRelatedLicense(rootLicenses, rec));
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
    collectPendingApplications(incoming, (rec) => upsertRelatedLicense(licenses, rec));
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

  collectPendingApplications(entity as Record<string, unknown>, add);

  [entity?.licenseAltId, entity?.LICENSESALTID, entity?.licensesAltId, normalizedLicenseAltId].forEach(
    (field) => {
      if (typeof field === 'string' && field.trim() !== '') {
        field.split(/[\s,;]+/).forEach((lic) => add(asRelatedLicense(lic)));
      }
    }
  );

  return map;
};
