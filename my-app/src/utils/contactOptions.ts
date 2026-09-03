// Shared dropdown option lists for the Individual / Organization contact forms.

export const COUNTRY_LIST: string[] = [
  'United States', 'Canada', 'Mexico', 'United Kingdom', 'Ireland', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands',
  'Belgium', 'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal', 'Austria', 'Czech Republic',
  'Hungary', 'Romania', 'Greece', 'Turkey', 'Ukraine', 'India', 'China', 'Japan', 'South Korea', 'Singapore',
  'Malaysia', 'Thailand', 'Indonesia', 'Philippines', 'Vietnam', 'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Chile',
  'Colombia', 'Peru', 'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'United Arab Emirates', 'Saudi Arabia', 'Israel', 'Other'
];

export const SORTED_COUNTRY_LIST: string[] = [...COUNTRY_LIST].sort((a, b) => a.localeCompare(b));

export const STATE_LIST_USA: string[] = [
  'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA',
  'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR',
  'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
];

export const ADDRESS_TYPES: string[] = ['Location Address', 'Mailing Address', 'Billing Address']; // fallback if Accela LIC_OWNERSHIP_ADDRESSES fails

export const UNIT_TYPES: string[] = ['Apt', 'Bldg', 'Dept', 'Floor', 'Room', 'Space', 'Ste', 'Unit'];

export const NAME_TITLE_OPTIONS: string[] = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.'];

export const NAME_SUFFIX_OPTIONS: string[] = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

export const GENDER_OPTIONS: string[] = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const US_CITIZEN_OPTIONS: string[] = ['Yes', 'No'];

// Fallback only — prefer Accela LIC_OWNERSHIP_PROFESSIONALS via RefDataContext.
export const PROFESSIONAL_TYPE_OPTIONS: string[] = [
  'Short-Term Rental Unit Property Owner',
  'Real Estate Broker',
  'Real Estate Agent',
  'Property Manager',
  'Contractor',
  'Other'
];
