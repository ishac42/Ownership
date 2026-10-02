const isLicenseNode = (entity) => !!(entity && entity.isLicenseNode);

/** Numeric percent owned. Missing or non-numeric values sort as 0. */
export const ownershipPercentOf = (entity) => {
  const raw = String(entity?.percentage ?? entity?.ownershipPercentage ?? '0').replace('%', '');
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
};

/** Same label the list uses, so equal percents follow the name on screen. */
export const ownershipDisplayNameOf = (entity) =>
  String(entity?.ownerName || entity?.firstName || entity?.parentName || '').trim();

/**
 * Owners largest percent first, then name (A–Z). Equal names keep their original order.
 * License nodes have no percent; they stay after the owners in their current order.
 */
export const sortOwnershipChildren = (children) => {
  const owners = [];
  const licenses = [];
  for (const child of children || []) {
    if (isLicenseNode(child)) licenses.push(child);
    else owners.push(child);
  }

  owners.sort((a, b) => {
    const byPercent = ownershipPercentOf(b) - ownershipPercentOf(a);
    if (byPercent !== 0) return byPercent;
    return ownershipDisplayNameOf(a).localeCompare(ownershipDisplayNameOf(b), 'en', {
      sensitivity: 'base',
    });
  });

  return [...owners, ...licenses];
};
