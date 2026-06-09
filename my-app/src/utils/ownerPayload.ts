// Builds the ASIT payload array sent to the Accela add/edit owner scripts.
// NOTE: The string keys below must match the field names expected by the
// backend Accela scripts (API_ADD_OWNER_INFO / API_EDIT_OWNER_INFO). New
// fields added to the contact forms are mapped here using descriptive keys;
// extend the Accela script mapping accordingly if a field is not persisted.

export interface OwnerFormData {
  ownershipType?: string;
  type?: string;
  percentage?: string;
  status?: string;

  // Organization
  ownerName?: string;
  resortHotel?: boolean | string;
  locationName?: string;
  attentionName?: string;
  stateLicenseNumber?: string;
  stateSalesTaxNumber?: string;
  professionalLicenseType?: string;
  profLicenseNumber?: string;
  businessDescription?: string;
  locationDescription?: string;
  webPage?: string;

  // Individual
  nameTitle?: string;
  firstName?: string;
  middleInitial?: string;
  lastName?: string;
  suffix?: string;
  attentionLine1?: string;
  pagerNumber?: string;
  dob?: string;
  gender?: string;
  usCitizen?: string;
  driversLicense?: string;
  driversLicenseState?: string;
  professionalType?: string;
  professionalLicNumber?: string;
  otherLicenseType?: string;
  otherLicenseNumber?: string;

  // Shared address / contact
  addressType?: string;
  optAddrLine?: string;
  unitType?: string;
  unitNumber?: string;
  ownershipAddr?: string;
  country?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
  faxNumber?: string;
  cellPhone?: string;
  comments?: string;

  [key: string]: any;
}

// Minimal payload for add-owner — only fields the Accela API_ADD_OWNER_INFO script accepts.
export const buildAddOwnerPayload = (formData: OwnerFormData) => [{
  'Business Phone': formData.phone,
  'Type': formData.ownershipType,
  'Title': formData.type || 'Owner',
  'Percent Owned': formData.percentage,
  'Status': formData.status || 'Active',
  'Entity Name': formData.ownerName,
  'First Name': formData.firstName,
  'Last Name': formData.lastName,
  'E-mail': formData.email,
  'Address Line 1': formData.ownershipAddr,
  'Unit Type': '',
  'Unit/Suite/Apt': 'Unit/Suite/Apt',
  'Country': formData.country || 'United States',
  'City': formData.city,
  'State': formData.state,
  'ZIP Code/Province Postal Code': formData.zip
}];

export const buildOwnerPayload = (formData: OwnerFormData) => {
  const isIndividual = (formData.ownershipType || '').toLowerCase().includes('individual');

  return [{
    // Core / app-specific
    'Type': formData.ownershipType,
    'Title': formData.type || 'Owner',
    'Percent Owned': formData.percentage,
  'Status': formData.status || 'Active',

    // Name
    'Entity Name': formData.ownerName,
    'Name Prefix': formData.nameTitle,
    'First Name': formData.firstName,
    'Middle Name': formData.middleInitial,
    'Last Name': formData.lastName,
    'Name Suffix': formData.suffix,
    'Resort Hotel': isIndividual ? '' : (formData.resortHotel ? 'Y' : 'N'),

    // Address
    'Address Type': formData.addressType,
    'Location Name': formData.locationName,
    'Attention Name': isIndividual ? formData.attentionLine1 : formData.attentionName,
    'Address Line 2': formData.optAddrLine,
    'Unit Type': formData.unitType,
    'Unit Number': formData.unitNumber,
    'Unit/Suite/Apt': formData.unitNumber || 'Unit/Suite/Apt',
    'Address Line 1': formData.ownershipAddr,
    'Country': formData.country || 'United States',
    'City': formData.city,
    'State': formData.state,
    'ZIP Code/Province Postal Code': formData.zip,

    // Contact
    'Business Phone': formData.phone,
    'Fax Number': formData.faxNumber,
    'Cell Phone': formData.cellPhone,
    'Pager Number': formData.pagerNumber,
    'E-mail': formData.email,
    'Web Page': formData.webPage,

    // Licenses / identifiers
    'State License Number': formData.stateLicenseNumber,
    'State Sales Tax Number': formData.stateSalesTaxNumber,
    'Professional License Type': isIndividual ? formData.professionalType : formData.professionalLicenseType,
    'Professional License Number': isIndividual ? formData.professionalLicNumber : formData.profLicenseNumber,
    'Other License Type': formData.otherLicenseType,
    'Other License Number': formData.otherLicenseNumber,
    'Drivers License Number': formData.driversLicense,
    'Drivers License State': formData.driversLicenseState,

    // Individual demographics
    'Date of Birth': formData.dob,
    'Gender': formData.gender,
    'US Citizen': formData.usCitizen,

    // Descriptions / notes
    'Business Description': formData.businessDescription,
    'Location Description': formData.locationDescription,
    'Comments': formData.comments
  }];
};
