export interface NormalizedEntity {
  ownerName: string;
  referenceNbr: string;
  ownershipType: string;
  contactType: string;
  contactAddress: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  fein: string;
  ssn: string;
  percentage: number;
  relatedContacts: NormalizedEntity[];
}

interface RawEntityNode {
  ownerName?: string;
  referenceNbr?: string;
  referenceNumber?: string;
  ownershipType?: string;
  type?: string;
  contactType?: string;
  contactAddress?: string;
  ownershipAddr?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  fein?: string;
  ssn?: string;
  percentage?: number;
  relatedContacts?: RawEntityNode[];
}

export const normalizeEntity = (node: RawEntityNode): NormalizedEntity => ({
  // Identity & Basics
  ownerName: node.ownerName || "",
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
