import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';

export interface RefChoice {
  value: string;
  description: string;
}

interface RefDataContextType {
  entityTypes: RefChoice[];
  addressTypes: RefChoice[];
  professionalTypes: RefChoice[];
  /** Accela standard-choice `value` strings only (no hardcoded fallback). */
  addressTypeOptions: string[];
  professionalTypeOptions: string[];
  isLoading: boolean;
  error: string | null;
}

const RefDataContext = createContext<RefDataContextType | undefined>(undefined);

const normalizeChoices = (raw: unknown): RefChoice[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: Record<string, unknown> | string) => {
      if (typeof item === 'string') {
        const value = item.trim();
        return { value, description: value };
      }
      const value = String(item?.value ?? item?.bizdomainValue ?? '').trim();
      const description = String(item?.description ?? value).trim();
      return { value, description };
    })
    .filter((item) => item.value !== '');
};

/** Accela Construct nests script output under varying envelopes; also may stringify. */
const extractScriptPayload = (apiBody: unknown): Record<string, unknown> => {
  const root = apiBody as Record<string, unknown> | null;
  let node: unknown =
    (root as any)?.data?.result?.result ??
    (root as any)?.data?.result ??
    (root as any)?.result?.result ??
    (root as any)?.result ??
    root;

  if (typeof node === 'string') {
    try {
      node = JSON.parse(node);
    } catch {
      return {};
    }
  }

  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const obj = node as Record<string, unknown>;
    // One more unwrap if the payload is still under .result
    if (
      obj.result &&
      typeof obj.result === 'object' &&
      !Array.isArray(obj.result) &&
      !(obj.titles || obj.values || obj.addresses || obj.professionals)
    ) {
      return obj.result as Record<string, unknown>;
    }
    return obj;
  }

  return {};
};

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

        const payload = extractScriptPayload(result);
        const titles = normalizeChoices(payload.titles ?? payload.values);
        const addresses = normalizeChoices(payload.addresses);
        const professionals = normalizeChoices(payload.professionals);

        setEntityTypes(titles);
        setAddressTypes(addresses);
        setProfessionalTypes(professionals);

        if (titles.length > 0 && addresses.length === 0 && professionals.length === 0) {
          console.warn(
            '[RefData] Titles loaded but addresses/professionals are empty. ' +
              'Deploy the updated API_GET_LIC_OWNERSHIP_TITLES Accela script ' +
              '(LIC_OWNERSHIP_ADDRESSES / LIC_OWNERSHIP_PROFESSIONALS).'
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Fetch error:', err);
        setError(message);
        setEntityTypes([]);
        setAddressTypes([]);
        setProfessionalTypes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const addressTypeOptions = useMemo(
    () => addressTypes.map((c) => c.value),
    [addressTypes]
  );
  const professionalTypeOptions = useMemo(
    () => professionalTypes.map((c) => c.value),
    [professionalTypes]
  );

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
