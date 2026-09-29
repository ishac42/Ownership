/**
 * Fill and bottom-border classes for a chart box.
 * Terminated ownership is a ring on the box, not its own fill.
 * @param {{ isIndividual: boolean, isLicenseNode: boolean, isPermit: boolean, isPendingApplication: boolean }} input
 * @returns {string}
 */
export function nodeColorClasses({
  isIndividual,
  isLicenseNode,
  isPermit,
  isPendingApplication,
}) {
  if (isLicenseNode) {
    if (isPermit) return 'bg-teal-700 border-teal-800';
    if (isPendingApplication) return 'bg-amber-600 border-amber-700';
    return 'bg-[#1e40af] border-[#1e3a8a]';
  }
  if (isIndividual) return 'bg-[#267471] border-[#1e5c5a]';
  return 'bg-[#792454] border-[#611d43]';
}

/** Chart legend entries. Swatches mirror the node cards (fill plus bottom edge). */
export const CHART_LEGEND_ITEMS = [
  { id: 'individual', group: 'Owners', label: 'Individual', swatchClass: 'bg-[#267471] border-b-2 border-[#1e5c5a]' },
  { id: 'organization', group: 'Owners', label: 'Organization', swatchClass: 'bg-[#792454] border-b-2 border-[#611d43]' },
  { id: 'license', group: 'Records', label: 'License record', swatchClass: 'bg-[#1e40af] border-b-2 border-[#1e3a8a]' },
  { id: 'application', group: 'Records', label: 'Application record', swatchClass: 'bg-amber-600 border-b-2 border-amber-700' },
  { id: 'permit', group: 'Records', label: 'Permit record', swatchClass: 'bg-teal-700 border-b-2 border-teal-800' },
];
