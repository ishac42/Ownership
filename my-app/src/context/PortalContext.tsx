import { createContext, useContext, type ReactNode } from 'react';

interface PortalContextValue {
  recordID: string;
}

const PortalContext = createContext<PortalContextValue>({ recordID: '' });

export function PortalProvider({
  recordID,
  children,
}: {
  recordID: string;
  children: ReactNode;
}) {
  return (
    <PortalContext.Provider value={{ recordID: recordID.trim() }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalParams(): PortalContextValue {
  return useContext(PortalContext);
}
