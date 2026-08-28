export type RelatedLicense = {
  altId: string;
  licenseType: string;
  businessName: string;
  locationAddress: string;
};

const blankDetails = (): Omit<RelatedLicense, 'altId'> => ({
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
  return {
    altId,
    licenseType: firstNonEmpty(item.licenseType, item.LICENSETYPE),
    businessName: firstNonEmpty(item.businessName, item.BUSINESSNAME),
    locationAddress: firstNonEmpty(item.locationAddress, item.LOCATIONADDRESS),
  };
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
    list.push(rec);
    return list;
  }
  const existing = list[existingIndex];
  list[existingIndex] = {
    altId: rec.altId,
    licenseType: rec.licenseType || existing.licenseType,
    businessName: rec.businessName || existing.businessName,
    locationAddress: rec.locationAddress || existing.locationAddress,
  };
  return list;
};

export const collectLicenseDetails = (
  entity: {
    _licenses?: unknown[];
    licenseAltId?: string;
    LICENSESALTID?: string;
    licensesAltId?: string;
  } | null,
  normalizedLicenseAltId?: string
): Map<string, RelatedLicense> => {
  const map = new Map<string, RelatedLicense>();

  const add = (rec: RelatedLicense | null) => {
    if (!rec) return;
    const existing = map.get(rec.altId);
    if (!existing) {
      map.set(rec.altId, rec);
      return;
    }
    map.set(rec.altId, {
      altId: rec.altId,
      licenseType: rec.licenseType || existing.licenseType,
      businessName: rec.businessName || existing.businessName,
      locationAddress: rec.locationAddress || existing.locationAddress,
    });
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
