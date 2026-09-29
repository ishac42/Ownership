export interface ChartNodeColorInput {
  isIndividual: boolean;
  isLicenseNode: boolean;
  isPermit: boolean;
  isPendingApplication: boolean;
}

export interface ChartLegendItem {
  id: 'individual' | 'organization' | 'license' | 'application' | 'permit' | 'terminated';
  label: string;
  swatchClass: string;
}

export function nodeColorClasses(input: ChartNodeColorInput): string;

export const CHART_LEGEND_ITEMS: readonly ChartLegendItem[];
