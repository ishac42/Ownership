export function ownershipPercentOf(entity: unknown): number;

export function ownershipDisplayNameOf(entity: unknown): string;

/** Owners by percent descending, then name. License nodes follow, in their original order. */
export function sortOwnershipChildren<T>(children: readonly T[] | null | undefined): T[];
