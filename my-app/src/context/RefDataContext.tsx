import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the shape of the data
interface RefDataContextType {
  entityTypes: string[];
  isLoading: boolean;
  error: string | null;
}

const RefDataContext = createContext<RefDataContextType | undefined>(undefined);

// --- FIX IS HERE: Ensure "export" is written before "const" ---
export const RefDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('http://localhost:3001/api/get-entity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body for now
      });

      console.log("Response Status:", response.status); // Should be 200 now

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Use the data array returned from the backend
        setEntityTypes(result.data?.result?.result?.values);
      } else {
        throw new Error(result.error || "Failed to fetch data");
      }

    } catch (err: any) {
      console.error("Fetch error:", err);
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

// --- FIX IS HERE ALSO: Ensure "export" is here ---
export const useRefData = () => {
  const context = useContext(RefDataContext);
  if (!context) {
    throw new Error('useRefData must be used within a RefDataProvider');
  }
  return context;
};