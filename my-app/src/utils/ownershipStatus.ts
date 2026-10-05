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

/** True when active child ownership percentages do not sum to exactly 100%. */
export const hasInvalidOwnershipTotal = (total: number): boolean => total !== 100;

/** Active owners of one parent cannot total more than this. */
export const MAX_OWNERSHIP_PERCENT = 100;

const OWNERSHIP_PERCENT_EPSILON = 1e-6;

/** Parses "25", "25%", or a number. Blank and non-numeric values are null. */
export const parseOwnershipPercent = (value: unknown): number | null => {
  const raw = String(value ?? '').replace(/%/g, '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

/** Hundredths, without trailing zeros, for messages. */
export const formatOwnershipPercent = (value: number): string => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return String(rounded);
};

export const ownershipPercentsDiffer = (left: unknown, right: unknown): boolean => {
  const a = parseOwnershipPercent(left);
  const b = parseOwnershipPercent(right);
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  return Math.abs(a - b) > OWNERSHIP_PERCENT_EPSILON;
};

/** True when another active owner cannot be added without passing 100%. */
export const ownershipTotalAtCap = (total: number): boolean =>
  total >= MAX_OWNERSHIP_PERCENT - OWNERSHIP_PERCENT_EPSILON;

export const ownershipAddBlockedReason = (currentActiveTotal: number): string =>
  `Active owners already total ${formatOwnershipPercent(currentActiveTotal)}%. Lower a percent or terminate an owner before adding another.`;

export interface OwnershipPercentChange {
  /** Sum of active siblings before this change, including this owner when they currently count. */
  currentActiveTotal: number;
  ownerCurrentPercent: number;
  ownerCurrentlyCounts: boolean;
  nextPercent: number | null;
  /** Whether this owner will be included in the active total after the change. */
  nextCounts: boolean;
  percentChanged: boolean;
  isNewOwner?: boolean;
}

/**
 * Active ownership of one parent must not rise above 100%.
 * A total that is already over 100% can stay or move down, so existing rows can be repaired.
 * A percent the user types must be from 0 through 100. An unchanged legacy value is left alone.
 */
export const ownershipPercentChangeError = (change: OwnershipPercentChange): string | null => {
  const currentActiveTotal = Number.isFinite(change.currentActiveTotal) ? change.currentActiveTotal : 0;
  const ownerCurrentPercent = Number.isFinite(change.ownerCurrentPercent) ? change.ownerCurrentPercent : 0;
  const baseline = currentActiveTotal - (change.ownerCurrentlyCounts ? ownerCurrentPercent : 0);
  const nextPercent = change.nextPercent;
  const userEnteredPercent = !!change.isNewOwner || change.percentChanged;

  if (userEnteredPercent) {
    if (nextPercent == null) return 'Enter a percent from 0 to 100.';
    if (nextPercent < -OWNERSHIP_PERCENT_EPSILON || nextPercent > MAX_OWNERSHIP_PERCENT + OWNERSHIP_PERCENT_EPSILON) {
      return 'Percent owned must be between 0 and 100.';
    }
  }

  if (change.isNewOwner && change.nextCounts && baseline >= MAX_OWNERSHIP_PERCENT - OWNERSHIP_PERCENT_EPSILON) {
    return ownershipAddBlockedReason(currentActiveTotal);
  }

  const projected = baseline + (change.nextCounts ? (nextPercent ?? 0) : 0);
  const overCap = projected > MAX_OWNERSHIP_PERCENT + OWNERSHIP_PERCENT_EPSILON;
  const increased = projected > currentActiveTotal + OWNERSHIP_PERCENT_EPSILON;

  if (overCap && increased) {
    if (currentActiveTotal > MAX_OWNERSHIP_PERCENT + OWNERSHIP_PERCENT_EPSILON) {
      return `Active owners already total ${formatOwnershipPercent(currentActiveTotal)}%. That total cannot go any higher. Lower a percent or terminate an owner first.`;
    }
    const room = Math.max(0, MAX_OWNERSHIP_PERCENT - baseline);
    return `Active owners would total ${formatOwnershipPercent(projected)}%. Percent owned cannot go above 100% (${formatOwnershipPercent(room)}% remaining).`;
  }

  return null;
};

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
