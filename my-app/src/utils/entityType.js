export const isOperatingEntityType = (contactType) =>
  /operating\s*entity/i.test(String(contactType ?? ''));

export const getEntityRef = (entity) => {
  const ref = String(entity?.referenceNbr || entity?.referenceNumber || entity?.id || '').trim();
  if (!ref || ref === 'N/A' || ref.startsWith('lic-')) return '';
  return ref;
};

export const ownershipTabId = (ref) => `ownership-${ref}`;
