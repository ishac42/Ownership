import { API_BASE_URL } from '../config';
import { buildOwnerPayload, type OwnerFormData } from './ownerPayload';

export interface OwnershipPortalValidationContext {
  parentRefNbr?: string;
  editRefNbr?: string;
  operation?: 'add' | 'edit';
}

export interface OwnershipPortalValidationResult {
  blocked: boolean;
  message: string;
  age: number;
}

/** Proxies to API_VALIDATE_OWNERSHIP_PORTAL (STR, email, ownership percent). */
export async function callOwnershipPortalValidation(
  formData: OwnerFormData,
  recordID?: string,
  context?: OwnershipPortalValidationContext
): Promise<OwnershipPortalValidationResult> {
  const response = await fetch(`${API_BASE_URL}/api/validate-ownership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dob: formData.dob || '',
      ownerArr: JSON.stringify(buildOwnerPayload(formData)),
      recordID: recordID || '',
      parentRefNbr: context?.parentRefNbr ?? '',
      editRefNbr: context?.editRefNbr ?? '',
      operation: context?.operation ?? '',
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || result.error || '');
  }

  return {
    blocked: result.blocked === true,
    message: result.message || '',
    age: typeof result.age === 'number' ? result.age : -1,
  };
}
