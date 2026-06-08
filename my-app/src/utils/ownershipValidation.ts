import { API_BASE_URL } from '../config';
import { buildOwnerPayload, type OwnerFormData } from './ownerPayload';

export interface OwnershipPortalValidationResult {
  blocked: boolean;
  message: string;
  age: number;
}

/** Proxies to API_VALIDATE_OWNERSHIP_PORTAL — no rules enforced in the web app. */
export async function callOwnershipPortalValidation(
  formData: OwnerFormData,
  recordID?: string
): Promise<OwnershipPortalValidationResult> {
  const response = await fetch(`${API_BASE_URL}/api/validate-ownership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dob: formData.dob || '',
      ownerArr: JSON.stringify(buildOwnerPayload(formData)),
      recordID: recordID || '',
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
