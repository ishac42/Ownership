import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  getOwnerReferenceNbr,
  getOwnerStatus,
  type OwnerStatus,
} from '../utils/ownershipStatus';

type StatusOverrides = Record<string, OwnerStatus>;

interface OwnershipStatusContextValue {
  showInactive: boolean;
  setShowInactive: (value: boolean) => void;
  getEffectiveStatus: (entity: unknown) => string;
  isEffectivelyInactive: (entity: unknown) => boolean;
  setStatusOverride: (refNbr: string, status: OwnerStatus) => void;
}

const OwnershipStatusContext = createContext<OwnershipStatusContextValue | null>(null);

export function OwnershipStatusProvider({ children }: { children: ReactNode }) {
  const [showInactive, setShowInactive] = useState(false);
  const [overrides, setOverrides] = useState<StatusOverrides>({});

  const getEffectiveStatus = useCallback(
    (entity: unknown): string => {
      const ref = getOwnerReferenceNbr(entity);
      if (ref && overrides[ref]) return overrides[ref];
      return getOwnerStatus(entity);
    },
    [overrides]
  );

  const isEffectivelyInactive = useCallback(
    (entity: unknown): boolean => getEffectiveStatus(entity).toLowerCase() === 'inactive',
    [getEffectiveStatus]
  );

  const setStatusOverride = useCallback((refNbr: string, status: OwnerStatus) => {
    if (!refNbr) return;
    setOverrides((prev) => ({ ...prev, [refNbr]: status }));
  }, []);

  const value = useMemo(
    () => ({
      showInactive,
      setShowInactive,
      getEffectiveStatus,
      isEffectivelyInactive,
      setStatusOverride,
    }),
    [showInactive, getEffectiveStatus, isEffectivelyInactive, setStatusOverride]
  );

  return (
    <OwnershipStatusContext.Provider value={value}>{children}</OwnershipStatusContext.Provider>
  );
}

export function useOwnershipStatus(): OwnershipStatusContextValue {
  const ctx = useContext(OwnershipStatusContext);
  if (!ctx) {
    throw new Error('useOwnershipStatus must be used within OwnershipStatusProvider');
  }
  return ctx;
}
