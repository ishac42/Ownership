import { useState } from 'react';

interface OwnerRecord {
  ownerName?: string;
  referenceNbr?: string;
  contactType?: string;
  contactAddress?: string;
  relatedContacts?: OwnerRecord[];
  [key: string]: unknown;
}

interface UseOwnershipSearchReturn {
  searchName: string;
  setSearchName: (name: string) => void;
  refNo: string;
  setRefNo: (refNo: string) => void;
  results: OwnerRecord[];
  selectedRecord: OwnerRecord | null;
  setSelectedRecord: (record: OwnerRecord | null) => void;
  isLoading: boolean;
  handleSearch: () => Promise<void>;
  refreshSelectedRecord: () => Promise<void>;
}

export const useOwnershipSearch = (): UseOwnershipSearchReturn => {
  const [searchName, setSearchName] = useState('');
  const [refNo, setRefNo] = useState('');
  const [results, setResults] = useState<OwnerRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OwnerRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Existing Search Logic
  const handleSearch = async () => {
    if (!searchName && !refNo) {
      alert("Please enter a name or reference number");
      return;
    }
    
    setResults([]);
    setSelectedRecord(null);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/retrieve-info', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchName, referenceNo: refNo }),
      });
      const backendResponse = await response.json();

      if (backendResponse.data?.result?.result?.owners) {
        setResults(backendResponse.data?.result.result.owners);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh only the selected record
  const refreshSelectedRecord = async () => {
    if (!selectedRecord?.referenceNbr) return;

    try {
      console.log("Refreshing data for:", selectedRecord.referenceNbr);
      
      const response = await fetch('http://localhost:3001/api/retrieve-info', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', referenceNo: selectedRecord.referenceNbr }),
      });
      const backendResponse = await response.json();

      const owners = backendResponse.data?.result?.result?.owners;
      
      if (owners && owners.length > 0) {
        setSelectedRecord(owners[0]); 
        
        setResults(prevResults => 
          prevResults.map(item => 
            item.referenceNbr === selectedRecord.referenceNbr ? owners[0] : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to refresh record", error);
    }
  };

  return {
    searchName, setSearchName,
    refNo, setRefNo,
    results, selectedRecord, setSelectedRecord,
    isLoading, handleSearch,
    refreshSelectedRecord
  };
};
