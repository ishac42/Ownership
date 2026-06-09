export const OWNER_STATUS_ACTIVE = 'Active';
export const OWNER_STATUS_TERMINATED = 'Terminated';
export const OWNER_STATUS_OPTIONS = [OWNER_STATUS_ACTIVE, OWNER_STATUS_TERMINATED] as const;

export type OwnerStatus = (typeof OWNER_STATUS_OPTIONS)[number];

export const getOwnerReferenceNbr = (entity: unknown): string =>
  String(
    (entity as Record<string, unknown>)?.referenceNbr ||
      (entity as Record<string, unknown>)?.referenceNumber ||
      (entity as Record<string, unknown>)?.id ||
      ''
  );

/** Maps API / legacy values to Active | Terminated. */
export const normalizeOwnerStatus = (status: unknown): OwnerStatus => {
  const value = String(status ?? '').trim().toLowerCase();
  if (value === 'terminated' || value === 'inactive') return OWNER_STATUS_TERMINATED;
  return OWNER_STATUS_ACTIVE;
};

export const getOwnerStatus = (entity: unknown): OwnerStatus => {
  const node = entity as Record<string, unknown> | null | undefined;
  const raw = node?.status ?? node?.Status ?? OWNER_STATUS_ACTIVE;
  return normalizeOwnerStatus(raw);
};

export const isTerminatedOwner = (entity: unknown): boolean =>
  getOwnerStatus(entity) === OWNER_STATUS_TERMINATED;

export const isLicenseNode = (entity: unknown): boolean =>
  !!(entity as Record<string, unknown>)?.isLicenseNode;

/** Ownership ASIT rows = shareholders in the BUSINESS OWNERSHIP table (not license nodes). */
export const isOwnershipAsitRow = (entity: unknown): boolean => {
  if (!entity || isLicenseNode(entity)) return false;

  const ref = getOwnerReferenceNbr(entity);
  if (!ref || ref === 'N/A' || ref.startsWith('lic-')) return false;

  return true;
};

export const shouldDisplayOwner = (
  entity: unknown,
  showTerminated: boolean,
  isTerminated: (entity: unknown) => boolean = isTerminatedOwner
): boolean => {
  if (isLicenseNode(entity)) return true;
  if (!isOwnershipAsitRow(entity)) return true;
  if (showTerminated) return true;
  return !isTerminated(entity);
};

export const filterContactsForDisplay = (
  contacts: unknown[],
  showTerminated: boolean,
  isTerminated: (entity: unknown) => boolean = isTerminatedOwner
): unknown[] =>
  (contacts || []).filter((child) => shouldDisplayOwner(child, showTerminated, isTerminated));

/** Sum percentages for Active ownership ASIT rows only. */
export const sumActiveChildPercentages = (
  children: unknown[],
  isTerminated: (entity: unknown) => boolean = isTerminatedOwner
): number =>
  (children || []).reduce<number>((sum, child) => {
    if (isLicenseNode(child) || !isOwnershipAsitRow(child) || isTerminated(child)) return sum;
    const node = child as Record<string, unknown>;
    const pct =
      parseFloat(String(node.percentage ?? node.ownershipPercentage ?? '0').replace('%', '')) || 0;
    return sum + pct;
  }, 0);

export const countHiddenTerminated = (
  contacts: unknown[],
  isTerminated: (entity: unknown) => boolean = isTerminatedOwner
): number =>
  (contacts || []).filter(
    (child) => isOwnershipAsitRow(child) && isTerminated(child)
  ).length;

/** Count terminated ownership rows in the full subtree (for toggle badge). */
export const countTerminatedInSubtree = (
  entity: unknown,
  isTerminated: (entity: unknown) => boolean = isTerminatedOwner
): number => {
  if (!entity) return 0;
  const node = entity as Record<string, unknown>;
  let count = 0;
  const children = (node.relatedContacts as unknown[]) || [];
  for (const child of children) {
    if (isOwnershipAsitRow(child) && isTerminated(child)) count += 1;
    count += countTerminatedInSubtree(child, isTerminated);
  }
  return count;
};
