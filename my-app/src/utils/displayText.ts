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
