import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { applyAllOwnerPatches } from '../utils/ownershipTree';

// Shared utility — move to utils/buildCacheMap.ts if you prefer
const buildCacheMap = (data: any[]): Record<string, any[]> => {
  const cacheMap: Record<string, any[]> = {};
  if (!Array.isArray(data)) return cacheMap;
  data.forEach((item) => {
    const childRef = item.childReferenceId || item.ChildReferenceID || item.childRefNo;
    if (childRef) {
      const key = String(childRef).trim();
      if (!cacheMap[key]) cacheMap[key] = [];
      cacheMap[key].push(item);
    }
  });
  return cacheMap;
};

// Recursively collect all reference numbers from a record and its children
const extractChildReferenceNumbers = (entity: any, refs: string[] = []): string[] => {
  if (!entity) return refs;
  const ref = entity.referenceNbr || entity.referenceNumber || entity.id;
  if (ref) refs.push(String(ref));
  const children = entity.relatedContacts || entity.children || [];
  if (Array.isArray(children)) {
    children.forEach((child: any) => extractChildReferenceNumbers(child, refs));
  }
  return [...new Set(refs)];
};

export const useOwnershipSearch = () => {
  const [searchName, setSearchName] = useState('');
  const [refNo, setRefNo] = useState('');
  const [nvBusId, setNvBusId] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkCache, setBulkCache] = useState<Record<string, any[]>>({});
  const ownerPatchesRef = useRef<Record<string, Record<string, unknown>>>({});
  const entityByRefCache = useRef<Record<string, any>>({});

  const handleSearch = async () => {
    if (!searchName && !refNo && !nvBusId)
      return alert('Please enter a name, reference number, or NV Business ID');

    setResults([]);
    setSelectedRecord(null);
    setBulkCache({});
    ownerPatchesRef.current = {};
    entityByRefCache.current = {};
    setIsLoading(true);

    try {
      const searchRes = await fetch(`${API_BASE_URL}/api/retrieve-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchName, referenceNo: refNo, nvBusinessId: nvBusId }),
      });
      const searchJson = await searchRes.json();
      const owners: any[] = searchJson.data?.result?.result?.owners ?? [];
      setResults(owners);

      if (owners.length === 0) return;

      const allRefs = owners.flatMap((record: any) => extractChildReferenceNumbers(record));
      const uniqueRefs = [...new Set(allRefs)];

      if (uniqueRefs.length === 0) return;

      const reverseRes = await fetch(`${API_BASE_URL}/api/reverseRelation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceNumbers: uniqueRefs }),
      });
      const reverseData = await reverseRes.json();
      setBulkCache(buildCacheMap(reverseData));
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSelectedRecord = useCallback(async () => {
    const rootRef = selectedRecord?.referenceNbr;
    if (!rootRef) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/retrieve-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', referenceNo: rootRef }),
      });
      const json = await res.json();
      const owners = json.data?.result?.result?.owners;
      if (owners && owners.length > 0) {
        const patched = applyAllOwnerPatches(owners[0], ownerPatchesRef.current);
        setSelectedRecord(patched);
        setResults((prev: any[]) =>
          prev.map((item: any) =>
            item.referenceNbr === rootRef ? patched : applyAllOwnerPatches(item, ownerPatchesRef.current)
          )
        );
      }
    } catch (error) {
      console.error('Failed to refresh record', error);
    }
  }, [selectedRecord?.referenceNbr]);

  const patchOwnerInSelectedRecord = useCallback((refNbr: string, updates: Record<string, unknown>) => {
    if (!refNbr) return;

    ownerPatchesRef.current = {
      ...ownerPatchesRef.current,
      [refNbr]: { ...(ownerPatchesRef.current[refNbr] ?? {}), ...updates },
    };

    setSelectedRecord((prev: any) =>
      prev ? applyAllOwnerPatches(prev, ownerPatchesRef.current) : prev
    );
    setResults((prev: any[]) =>
      prev.map((item: any) => applyAllOwnerPatches(item, ownerPatchesRef.current))
    );
  }, []);

  const loadEntityByRef = useCallback(async (referenceNo: string) => {
    const ref = String(referenceNo || '').trim();
    if (!ref || ref === 'N/A') return null;

    if (entityByRefCache.current[ref]) {
      return applyAllOwnerPatches(entityByRefCache.current[ref], ownerPatchesRef.current);
    }

    const searchRes = await fetch(`${API_BASE_URL}/api/retrieve-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', referenceNo: ref, nvBusinessId: '' }),
    });
    const searchJson = await searchRes.json();

    if (!searchRes.ok || searchJson.success === false) {
      throw new Error(searchJson.error || `Search failed (${searchRes.status})`);
    }

    const rawOwners = searchJson.data?.result?.result?.owners;
    const owners: any[] = Array.isArray(rawOwners) ? rawOwners : [];
    const match =
      owners.find((item) => String(item.referenceNbr || item.referenceNumber || '') === ref) ||
      owners[0];
    if (!match) return null;

    entityByRefCache.current[ref] = match;

    const uniqueRefs = extractChildReferenceNumbers(match);
    if (uniqueRefs.length > 0) {
      void fetch(`${API_BASE_URL}/api/reverseRelation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceNumbers: uniqueRefs }),
      })
        .then(async (reverseRes) => {
          if (!reverseRes.ok) {
            console.error('Reverse relation request failed:', reverseRes.status);
            return;
          }
          const reverseData = await reverseRes.json();
          const incoming = buildCacheMap(Array.isArray(reverseData) ? reverseData : []);
          setBulkCache((prev) => ({ ...prev, ...incoming }));
        })
        .catch((error) => {
          console.error('Reverse relation request failed for operating entity:', error);
        });
    }

    return applyAllOwnerPatches(match, ownerPatchesRef.current);
  }, []);

  return {
    searchName,
    setSearchName,
    refNo,
    setRefNo,
    nvBusId,
    setNvBusId,
    results,
    selectedRecord,
    setSelectedRecord,
    isLoading,
    handleSearch,
    refreshSelectedRecord,
    patchOwnerInSelectedRecord,
    loadEntityByRef,
    bulkCache,
  };
};
