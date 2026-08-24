import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
  ADDRESS_TYPES as ADDRESS_TYPE_FALLBACK,
  PROFESSIONAL_TYPE_OPTIONS as PROFESSIONAL_TYPE_FALLBACK,
} from '../utils/contactOptions';

export interface RefChoice {
  value: string;
  description: string;
}

interface RefDataContextType {
  entityTypes: RefChoice[];
  addressTypes: RefChoice[];
  professionalTypes: RefChoice[];
  /** String values for select options (Accela `value`, with local fallback). */
  addressTypeOptions: string[];
  professionalTypeOptions: string[];
  isLoading: boolean;
  error: string | null;
}

const RefDataContext = createContext<RefDataContextType | undefined>(undefined);

const normalizeChoices = (raw: unknown): RefChoice[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => ({
      value: String(item?.value ?? '').trim(),
      description: String(item?.description ?? item?.value ?? '').trim(),
    }))
    .filter((item) => item.value !== '');
};

const choiceValues = (choices: RefChoice[], fallback: string[]): string[] =>
  choices.length > 0 ? choices.map((c) => c.value) : fallback;

export const RefDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entityTypes, setEntityTypes] = useState<RefChoice[]>([]);
  const [addressTypes, setAddressTypes] = useState<RefChoice[]>([]);
  const [professionalTypes, setProfessionalTypes] = useState<RefChoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/get-entity-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        // Accela: result.data.result.result  (script return nested under Construct/Accela envelope)
        const payload = result.data?.result?.result || {};

        // New shape: titles / addresses / professionals
        // Legacy shape: values only (titles)
        const titles = normalizeChoices(payload.titles ?? payload.values);
        const addresses = normalizeChoices(payload.addresses);
        const professionals = normalizeChoices(payload.professionals);

        setEntityTypes(titles);
        setAddressTypes(addresses);
        setProfessionalTypes(professionals);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Fetch error:', err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const addressTypeOptions = choiceValues(addressTypes, ADDRESS_TYPE_FALLBACK);
  const professionalTypeOptions = choiceValues(professionalTypes, PROFESSIONAL_TYPE_FALLBACK);

  return (
    <RefDataContext.Provider
      value={{
        entityTypes,
        addressTypes,
        professionalTypes,
        addressTypeOptions,
        professionalTypeOptions,
        isLoading,
        error,
      }}
    >
      {children}
    </RefDataContext.Provider>
  );
};

export const useRefData = () => {
  const context = useContext(RefDataContext);
  if (!context) {
    throw new Error('useRefData must be used within a RefDataProvider');
  }
  return context;
};
