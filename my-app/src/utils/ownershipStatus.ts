export const OWNER_STATUS_ACTIVE = 'Active';
export const OWNER_STATUS_INACTIVE = 'Inactive';
export const OWNER_STATUS_OPTIONS = [OWNER_STATUS_ACTIVE, OWNER_STATUS_INACTIVE] as const;

export type OwnerStatus = (typeof OWNER_STATUS_OPTIONS)[number];

export const getOwnerReferenceNbr = (entity: unknown): string =>
  String(
    (entity as Record<string, unknown>)?.referenceNbr ||
      (entity as Record<string, unknown>)?.referenceNumber ||
      (entity as Record<string, unknown>)?.id ||
      ''
  );

export const getOwnerStatus = (entity: unknown): string => {
  const node = entity as Record<string, unknown> | null | undefined;
  const status = node?.status ?? node?.Status ?? OWNER_STATUS_ACTIVE;
  const trimmed = String(status).trim();
  return trimmed || OWNER_STATUS_ACTIVE;
};

export const isInactiveOwner = (entity: unknown): boolean =>
  getOwnerStatus(entity).toLowerCase() === 'inactive';

export const isLicenseNode = (entity: unknown): boolean =>
  !!(entity as Record<string, unknown>)?.isLicenseNode;

export const shouldDisplayOwner = (
  entity: unknown,
  showInactive: boolean,
  isInactive: (entity: unknown) => boolean = isInactiveOwner
): boolean => {
  if (isLicenseNode(entity)) return true;
  if (showInactive) return true;
  return !isInactive(entity);
};

export const filterContactsForDisplay = (
  contacts: unknown[],
  showInactive: boolean,
  isInactive: (entity: unknown) => boolean = isInactiveOwner
): unknown[] =>
  (contacts || []).filter((child) => shouldDisplayOwner(child, showInactive, isInactive));

export const sumActiveChildPercentages = (
  children: unknown[],
  isInactive: (entity: unknown) => boolean = isInactiveOwner
): number =>
  (children || []).reduce<number>((sum, child) => {
    if (isLicenseNode(child) || isInactive(child)) return sum;
    const node = child as Record<string, unknown>;
    const pct =
      parseFloat(String(node.percentage ?? node.ownershipPercentage ?? '0').replace('%', '')) || 0;
    return sum + pct;
  }, 0);

export const countHiddenInactive = (
  contacts: unknown[],
  isInactive: (entity: unknown) => boolean = isInactiveOwner
): number =>
  (contacts || []).filter((child) => !isLicenseNode(child) && isInactive(child)).length;

export const countAllInactiveInTree = (
  entity: unknown,
  isInactive: (entity: unknown) => boolean = isInactiveOwner
): number => {
  if (!entity) return 0;
  const node = entity as Record<string, unknown>;
  let count = 0;
  const children = (node.relatedContacts as unknown[]) || [];
  for (const child of children) {
    if (!isLicenseNode(child) && isInactive(child)) count += 1;
    count += countAllInactiveInTree(child, isInactive);
  }
  return count;
};
