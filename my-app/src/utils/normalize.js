export const normalizeEntity = (node) => ({
  // Identity & Basics
  ownerName: node.ownerName,
  referenceNbr: node.referenceNbr || node.referenceNumber || "N/A",
  
  // Entity Classification
  ownershipType: node.ownershipType || (node.type === "Individual" ? "Individual" : "Organization"),
  contactType: node.contactType || node.type || "Individual",
  
  // Contact & Location (Normalizing keys like ownershipAddr)
  contactAddress: node.contactAddress || node.ownershipAddr || "",
  city: node.city || "",
  state: node.state || "",
  zip: node.zip || "",
  email: node.email || "",
  phone: node.phone || node.phoneNumber || "",
  
  // Identifiers
  fein: node.fein || "",
  ssn: node.ssn || "",
  
  // Ownership Math
  percentage: node.percentage ?? 0,
  
  // Recursive mapping for the nested tree structure
  relatedContacts: Array.isArray(node.relatedContacts)
    ? node.relatedContacts.map(normalizeEntity)
    : []
});