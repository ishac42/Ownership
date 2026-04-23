export const normalizeEntity = (node) => ({
  // Identity & Basics
  ownerName: node.ownerName || [node.firstName, node.lastName].filter(Boolean).join(" "),
  referenceNbr: node.referenceNbr || node.referenceNumber || "N/A",
  firstName: node.firstName || "",
  lastName: node.lastName || "",
  
  // Entity Classification
  ownershipType: node.ownershipType || (node.type === "Individual" ? "Individual" : "Organization"),
  contactType: node.contactType || node.type || "Individual",
  type: node.type || node.contactType || "",
  
  // Contact & Location (Normalizing keys like ownershipAddr)
  ownershipAddr: node.ownershipAddr || "",
  contactAddress: node.contactAddress || "",
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