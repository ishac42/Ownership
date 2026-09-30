export function stripOwnerPatchUpdates(
  updates: Record<string, unknown>
): Record<string, unknown>;

export function patchOwnerInTree(
  node: unknown,
  refNbr: string,
  updates: Record<string, unknown>
): unknown;

export function referenceFromAddResponse(body: unknown): string;

export function insertOwnerUnderParent(
  node: unknown,
  parentRef: string,
  child: Record<string, unknown>
): unknown;

export function removeOwnerFromParent(
  node: unknown,
  parentRef: string,
  childRef: string
): unknown;
