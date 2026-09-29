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

/** Every color the chart legend explains. Terminated is an outline so it stays visible on the white panel. */
export const CHART_LEGEND_ITEMS = [
  { id: 'individual', label: 'Individual', swatchClass: 'bg-[#267471]' },
  { id: 'organization', label: 'Organization', swatchClass: 'bg-[#792454]' },
  { id: 'license', label: 'License record', swatchClass: 'bg-[#1e40af]' },
  { id: 'application', label: 'Application record', swatchClass: 'bg-amber-600' },
  { id: 'permit', label: 'Permit record', swatchClass: 'bg-teal-700' },
  { id: 'terminated', label: 'Terminated', swatchClass: 'bg-white ring-2 ring-slate-400' },
];
