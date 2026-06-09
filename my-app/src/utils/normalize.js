export const normalizeEntity = (node) => ({
  // Identity & Basics
  ownerName: node.ownerName || [node.firstName, node.lastName].filter(Boolean).join(" "),
  referenceNbr: node.referenceNbr || node.referenceNumber || "N/A",
  nameTitle: node.nameTitle || "",
  firstName: node.firstName || "",
  middleInitial: node.middleInitial || node.middleName || "",
  lastName: node.lastName || "",
  suffix: node.suffix || "",

  // Entity Classification
  ownershipType: node.ownershipType || (node.type === "Individual" ? "Individual" : "Organization"),
  contactType: node.contactType || node.type || "Individual",
  type: node.type || node.contactType || "",
  resortHotel: node.resortHotel || "",

  // Address
  addressType: node.addressType || "Location Address",
  locationName: node.locationName || "",
  attentionName: node.attentionName || "",
  attentionLine1: node.attentionLine1 || "",
  optAddrLine: node.optAddrLine || "",
  unitType: node.unitType || "",
  unitNumber: node.unitNumber || "",
  ownershipAddr: node.ownershipAddr || "",
  contactAddress: node.contactAddress || "",
  city: node.city || "",
  country: node.country || "",
  state: node.state || "",
  zip: node.zip || "",

  // Contact
  email: node.email || "",
  phone: node.phone || node.phoneNumber || "",
  faxNumber: node.faxNumber || "",
  cellPhone: node.cellPhone || "",
  pagerNumber: node.pagerNumber || "",
  webPage: node.webPage || "",

  // Identifiers / Licenses
  fein: node.fein || "",
  ssn: node.ssn || "",
  stateLicenseNumber: node.stateLicenseNumber || "",
  stateSalesTaxNumber: node.stateSalesTaxNumber || "",
  professionalLicenseType: node.professionalLicenseType || "",
  profLicenseNumber: node.profLicenseNumber || "",
  professionalType: node.professionalType || "",
  professionalLicNumber: node.professionalLicNumber || "",
  otherLicenseType: node.otherLicenseType || "",
  otherLicenseNumber: node.otherLicenseNumber || "",
  driversLicense: node.driversLicense || "",
  driversLicenseState: node.driversLicenseState || "",

  // Individual demographics
  dob: node.dob || "",
  gender: node.gender || "",
  usCitizen: node.usCitizen || "",

  // Descriptions / notes
  businessDescription: node.businessDescription || "",
  locationDescription: node.locationDescription || "",
  comments: node.comments || "",

  // Ownership Math
  percentage: node.percentage ?? 0,

  // Ownership ASIT status (CLARK-4145): Active | Terminated
  status: node.status || node.Status || 'Active',

  // Preserve ids for status overrides / filtering
  referenceNumber: node.referenceNumber || node.referenceNbr || '',
  id: node.id || node.referenceNbr || node.referenceNumber || '',
  parentRefNbr: node.parentRefNbr || '',
  isChildOfCurrent: node.isChildOfCurrent || false,
  isLicenseNode: node.isLicenseNode || false,

  // Recursive mapping for the nested tree structure
  relatedContacts: Array.isArray(node.relatedContacts)
    ? node.relatedContacts.map(normalizeEntity)
    : []
});