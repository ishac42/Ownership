import { useState } from 'react';
import { API_BASE_URL } from '../config';

export const useOwnershipSearch = () => {
  const [searchName, setSearchName] = useState('');
  const [refNo, setRefNo] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Existing Search Logic
  const handleSearch = async () => {
    if (!searchName && !refNo) return alert("Please enter a name or reference number");
    
    setResults([]);
    setSelectedRecord(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/retrieve-info`, { 
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

  // --- NEW: Function to refresh only the selected record ---
  const refreshSelectedRecord = async () => {
    if (!selectedRecord?.referenceNbr) return;

    try {
      console.log("Refreshing data for:", selectedRecord.referenceNbr);
      
      // We search specifically by the current Reference Number to get the latest tree
      const response = await fetch(`${API_BASE_URL}/api/retrieve-info`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', referenceNo: selectedRecord.referenceNbr }),
      });
      const backendResponse = await response.json();

      const owners = backendResponse.data?.result?.result?.owners;
      
      if (owners && owners.length > 0) {
        // Update the selected record with the fresh data from the backend
        setSelectedRecord(owners[0]); 
        
        // Optional: Also update the specific item in the results list so the table is current
        setResults((prevResults: any[]) => 
          prevResults.map((item: any) => 
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
    refreshSelectedRecord // <--- Exporting the new function
  };
};