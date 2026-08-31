/** Accela contact type for an operating entity (Jira CLARK-4658). */
export const isOperatingEntity = (contactType) => {
  const normalized = String(contactType ?? '')
    .replace(/\*+$/g, '')
    .trim()
    .toLowerCase();
  return normalized === 'operating entity';
};

export const getEntityRef = (entity) => {
  const ref = String(entity?.referenceNbr || entity?.referenceNumber || entity?.id || '').trim();
  if (!ref || ref === 'N/A') return '';
  return ref;
};

export const ownershipTabId = (ref) => `ownership-${ref}`;
