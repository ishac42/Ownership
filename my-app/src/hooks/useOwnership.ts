import { useState } from 'react';
import { API_BASE_URL } from '../config';

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

  const handleSearch = async () => {
    if (!searchName && !refNo && !nvBusId)
      return alert('Please enter a name, reference number, or NV Business ID');

    setResults([]);
    setSelectedRecord(null);
    setBulkCache({});         // Clear stale cache from previous search
    setIsLoading(true);

    try {
      // 1. Main search
      const searchRes = await fetch(`${API_BASE_URL}/api/retrieve-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchName, referenceNo: refNo, nvBusinessId: nvBusId }),
      });
      const searchJson = await searchRes.json();
      const owners: any[] = searchJson.data?.result?.result?.owners ?? [];
      setResults(owners);

      if (owners.length === 0) return;

      // 2. Collect every ref number across all results and their children in one pass
      const allRefs = owners.flatMap((record: any) => extractChildReferenceNumbers(record));
      const uniqueRefs = [...new Set(allRefs)];

      if (uniqueRefs.length === 0) return;

      // 3. Single bulk reverse-relations call — one DB hit, upfront, done
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

  const refreshSelectedRecord = async () => {
    if (!selectedRecord?.referenceNbr) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/retrieve-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', referenceNo: selectedRecord.referenceNbr }),
      });
      const json = await res.json();
      const owners = json.data?.result?.result?.owners;
      if (owners?.length > 0) {
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
    searchName, setSearchName,
    refNo, setRefNo,
    nvBusId, setNvBusId,
    results, selectedRecord, setSelectedRecord,
    isLoading, handleSearch,
    refreshSelectedRecord,
    bulkCache,             // Pass this down through TabWorkspace → RelatedBusinessesView
  };
};