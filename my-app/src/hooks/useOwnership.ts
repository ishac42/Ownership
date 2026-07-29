import { useCallback, useState } from 'react';
import { apiPostJson, ApiRequestError } from '../utils/apiFetch';

export interface SearchParams {
  name?: string;
  referenceNo?: string;
  nvBusinessId?: string;
}

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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bulkCache, setBulkCache] = useState<Record<string, any[]>>({});

  const handleSearch = useCallback(async (overrides?: SearchParams) => {
    const name = overrides?.name ?? searchName;
    const referenceNo = overrides?.referenceNo ?? refNo;
    const nvBusinessId = overrides?.nvBusinessId ?? nvBusId;

    if (!name && !referenceNo && !nvBusinessId) {
      alert('Please enter a name, reference number, or NV Business ID');
      return;
    }

    setResults([]);
    setSelectedRecord(null);
    setBulkCache({});
    setSearchError(null);
    setIsLoading(true);

    try {
      const searchJson = await apiPostJson<{ data?: { result?: { result?: { owners?: any[] } } } }>(
        '/api/retrieve-info',
        { name, referenceNo, nvBusinessId }
      );
      const owners: any[] = searchJson.data?.result?.result?.owners ?? [];
      setResults(owners);

      if (owners.length === 0) {
        setSearchError('No matching records were found in Accela for that search.');
        return;
      }

      const allRefs = owners.flatMap((record: any) => extractChildReferenceNumbers(record));
      const uniqueRefs = [...new Set(allRefs)];

      if (uniqueRefs.length === 0) return;

      const reverseData = await apiPostJson<any[]>('/api/reverseRelation', {
        referenceNumbers: uniqueRefs,
      });
      setBulkCache(buildCacheMap(reverseData));
    } catch (error) {
      console.error('Error during search:', error);
      setSearchError(
        error instanceof ApiRequestError
          ? error.message
          : 'Search failed unexpectedly. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchName, refNo, nvBusId]);

  const refreshSelectedRecord = async () => {
    if (!selectedRecord?.referenceNbr) return;
    try {
      const json = await apiPostJson<{ data?: { result?: { result?: { owners?: any[] } } } }>(
        '/api/retrieve-info',
        { name: '', referenceNo: selectedRecord.referenceNbr }
      );
      const owners = json.data?.result?.result?.owners;
      if (owners && owners.length > 0) {
        setSelectedRecord(owners[0]);
        setResults((prev: any[]) =>
          prev.map((item: any) =>
            item.referenceNbr === selectedRecord.referenceNbr ? owners[0] : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to refresh record', error);
    }
  };

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
    searchError,
    handleSearch,
    refreshSelectedRecord,
    bulkCache,
  };
};
