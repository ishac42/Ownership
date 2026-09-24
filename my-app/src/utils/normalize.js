const firstPresent = (...values) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && text.toLowerCase() !== "null") return text;
  }
  return "";
};

/** Every entity chart node shows NV Business ID when it has one. License records do not. */
export const shouldShowChartNvBusinessId = (isLicenseNode, nvBusinessId) =>
  !isLicenseNode && firstPresent(nvBusinessId) !== "";

const entityRef = (node) => {
  const ref = firstPresent(node?.referenceNbr, node?.referenceNumber);
  return ref && ref !== "N/A" ? ref : "";
};

/** Remember NV Business ID by contact reference so the same entity can show it on every card. */
export const collectNvBusinessIds = (node, into = {}) => {
  if (!node || typeof node !== "object") return into;
  if (Array.isArray(node)) {
    node.forEach((item) => collectNvBusinessIds(item, into));
    return into;
  }

  const id = firstPresent(node.nvBusinessId, node.nvBusinessID, node.NVBUSINESSID, node.nvNum);
  const ref = entityRef(node);
  if (id && ref && !into[ref]) into[ref] = id;

  if (Array.isArray(node.relatedContacts)) {
    node.relatedContacts.forEach((child) => collectNvBusinessIds(child, into));
  }
  if (Array.isArray(node.parents)) {
    node.parents.forEach((child) => collectNvBusinessIds(child, into));
  }
  return into;
};

export const lookupNvBusinessId = (node, byRef) => {
  const own = firstPresent(node?.nvBusinessId, node?.nvBusinessID, node?.NVBUSINESSID, node?.nvNum);
  if (own) return own;
  const ref = entityRef(node);
  if (!ref || !byRef) return "";
  return firstPresent(byRef[ref]);
};

export const normalizeEntity = (node) => ({
  // Identity & Basics
  ownerName: node.ownerName || [node.firstName, node.lastName].filter(Boolean).join(" "),
  referenceNbr: node.referenceNbr || node.referenceNumber || "N/A",
  nvBusinessId: firstPresent(node.nvBusinessId, node.nvBusinessID, node.NVBUSINESSID),
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
  percentage: node.percentage ?? node.percentOwned ?? node.PERCENTOWNED ?? node.PERCENTAGE ?? 0,

  // Ownership ASIT status (CLARK-4145): Active | Terminated
  status: node.status || node.Status || 'Active',

  // Preserve ids for status overrides / filtering
  referenceNumber: node.referenceNumber || node.referenceNbr || '',
  id: node.id || node.referenceNbr || node.referenceNumber || '',
  parentRefNbr: node.parentRefNbr || '',
  isChildOfCurrent: node.isChildOfCurrent || false,
  isLicenseNode: node.isLicenseNode || false,
  isPendingApplication: node.isPendingApplication || false,
  isPermit: node.isPermit || false,
  applicationStatus: node.applicationStatus || '',
  licenseType: node.licenseType || '',
  businessName: node.businessName || '',
  locationAddress: node.locationAddress || '',

  // Recursive mapping for the nested tree structure
  relatedContacts: Array.isArray(node.relatedContacts)
    ? node.relatedContacts.map(normalizeEntity)
    : []
});