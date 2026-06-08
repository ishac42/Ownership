import { createContext, useContext, type ReactNode } from 'react';

interface PortalContextValue {
  capId: string;
}

const PortalContext = createContext<PortalContextValue>({ capId: '' });

export function PortalProvider({
  capId,
  children,
}: {
  capId: string;
  children: ReactNode;
}) {
  return (
    <PortalContext.Provider value={{ capId: capId.trim() }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalParams(): PortalContextValue {
  return useContext(PortalContext);
}
