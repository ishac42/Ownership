export function stripOwnerPatchUpdates(
  updates: Record<string, unknown>
): Record<string, unknown>;

export function patchOwnerInTree(
  node: unknown,
  refNbr: string,
  updates: Record<string, unknown>
): unknown;
