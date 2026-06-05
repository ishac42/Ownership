import { API_BASE_URL } from '../config';
import { buildOwnerPayload, type OwnerFormData } from './ownerPayload';

const UNDER_18_MESSAGE = 'Property Owner must be at least 18 years old.';

export interface OwnershipValidationResult {
  blocked: boolean;
  message: string;
  age: number;
}

const calculateAgeFromDob = (dobStr: string): number => {
  const trimmed = dobStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let dob: Date | null = null;

  if (isoMatch) {
    dob = new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10)
    );
  } else {
    const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      dob = new Date(
        parseInt(usMatch[3], 10),
        parseInt(usMatch[1], 10) - 1,
        parseInt(usMatch[2], 10)
      );
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) dob = parsed;
    }
  }

  if (!dob) return -1;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
};

export const validateOwnershipAgeLocal = (
  formData: OwnerFormData
): OwnershipValidationResult | null => {
  const dob = (formData.dob || '').trim();
  if (!dob) return null;

  const age = calculateAgeFromDob(dob);
  if (age >= 0 && age < 18) {
    return { blocked: true, message: UNDER_18_MESSAGE, age };
  }

  return null;
};

export async function validateOwnershipAge(
  formData: OwnerFormData
): Promise<OwnershipValidationResult> {
  const localResult = validateOwnershipAgeLocal(formData);
  if (localResult) return localResult;

  const response = await fetch(`${API_BASE_URL}/api/validate-ownership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dob: formData.dob || '',
      ownerArr: JSON.stringify(buildOwnerPayload(formData)),
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    return {
      blocked: true,
      message: result.message || result.error || 'Ownership validation failed',
      age: -1,
    };
  }

  return {
    blocked: result.blocked === true,
    message: result.message || '',
    age: typeof result.age === 'number' ? result.age : -1,
  };
};
