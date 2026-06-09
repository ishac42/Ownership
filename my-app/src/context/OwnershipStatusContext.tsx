import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  getOwnerReferenceNbr,
  getOwnerStatus,
  normalizeOwnerStatus,
  type OwnerStatus,
} from '../utils/ownershipStatus';

type StatusOverrides = Record<string, OwnerStatus>;

interface OwnershipStatusContextValue {
  showTerminated: boolean;
  setShowTerminated: (value: boolean) => void;
  getEffectiveStatus: (entity: unknown) => OwnerStatus;
  isEffectivelyTerminated: (entity: unknown) => boolean;
  setStatusOverride: (refNbr: string, status: OwnerStatus) => void;
}

const OwnershipStatusContext = createContext<OwnershipStatusContextValue | null>(null);

export function OwnershipStatusProvider({ children }: { children: ReactNode }) {
  const [showTerminated, setShowTerminated] = useState(false);
  const [overrides, setOverrides] = useState<StatusOverrides>({});

  const getEffectiveStatus = useCallback(
    (entity: unknown): OwnerStatus => {
      const ref = getOwnerReferenceNbr(entity);
      if (ref && overrides[ref]) return overrides[ref];
      return getOwnerStatus(entity);
    },
    [overrides]
  );

  const isEffectivelyTerminated = useCallback(
    (entity: unknown): boolean => {
      const status = getEffectiveStatus(entity);
      return normalizeOwnerStatus(status) === 'Terminated';
    },
    [getEffectiveStatus]
  );

  const setStatusOverride = useCallback((refNbr: string, status: OwnerStatus) => {
    if (!refNbr) return;
    setOverrides((prev) => ({ ...prev, [refNbr]: normalizeOwnerStatus(status) }));
  }, []);

  const value = useMemo(
    () => ({
      showTerminated,
      setShowTerminated,
      getEffectiveStatus,
      isEffectivelyTerminated,
      setStatusOverride,
    }),
    [showTerminated, getEffectiveStatus, isEffectivelyTerminated, setStatusOverride]
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
