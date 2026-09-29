/** UI-only: capitalize the first character. Does not mutate stored/API values. */
export const capitalizeFirstLetter = (value: unknown): string => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const equalsIgnoreCase = (a: unknown, b: unknown): boolean =>
  String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/** Keep Accela's casing when switching Individual/Organization so edits don't rewrite Type. */
export const applySameCasing = (source: unknown, nextValue: string): string => {
  const template = String(source ?? '');
  if (!template) return nextValue;
  if (template === template.toLowerCase()) return nextValue.toLowerCase();
  if (template === template.toUpperCase()) return nextValue.toUpperCase();
  return capitalizeFirstLetter(nextValue);
};

const INDIVIDUAL_NAME_FIELDS = ['firstName', 'middleInitial', 'lastName'] as const;

/** First letter of each word uppercase, remaining letters lowercase. Spacing and punctuation stay as typed. */
export const toProperCase = (value: string): string =>
  value.replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

export const isIndividualOwner = (ownershipType: unknown): boolean =>
  String(ownershipType ?? '').toLowerCase().includes('individual');

/** Force proper case on an individual's first, middle, and last name. Organization fields are left unchanged. */
export const applyIndividualNameCase = <T extends { ownershipType?: unknown }>(formData: T): T => {
  if (!isIndividualOwner(formData.ownershipType)) return formData;

  const record = formData as T & Record<(typeof INDIVIDUAL_NAME_FIELDS)[number], unknown>;
  let next: T | null = null;

  for (const field of INDIVIDUAL_NAME_FIELDS) {
    const current = record[field];
    if (typeof current !== 'string') continue;
    const cased = toProperCase(current);
    if (cased === current) continue;
    if (!next) next = { ...formData };
    (next as Record<string, unknown>)[field] = cased;
  }

  return next ?? formData;
};
