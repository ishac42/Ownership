import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// ✅ Define proper type
interface EntityType {
  value: string;
  description: string;
}

// ✅ Context shape
interface RefDataContextType {
  entityTypes: EntityType[];
  isLoading: boolean;
  error: string | null;
}

const RefDataContext = createContext<RefDataContextType | undefined>(undefined);

export const RefDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`${API_BASE_URL}/api/get-entity-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          // ✅ Safely extract + normalize data
          const rawValues = result.data?.result?.result?.values || [];

          const formatted: EntityType[] = rawValues.map((item: any) => ({
            value: item.value,
            description: item.description,
          }));

          setEntityTypes(formatted);
        } else {
          throw new Error(result.error || 'Failed to fetch data');
        }

      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <RefDataContext.Provider value={{ entityTypes, isLoading, error }}>
      {children}
    </RefDataContext.Provider>
  );
};

// ✅ Hook
export const useRefData = () => {
  const context = useContext(RefDataContext);
  if (!context) {
    throw new Error('useRefData must be used within a RefDataProvider');
  }
  return context;
};