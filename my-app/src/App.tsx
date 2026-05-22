import { useState, useEffect, type KeyboardEvent } from 'react';
import logo from './Logo.jpg'; 
import { CheckCircle } from 'lucide-react';
import { useOwnershipSearch } from './hooks/useOwnership';
import SearchControls from './components/SearchControls';
import Pagination from './components/Pagination'; 
import { RefDataProvider } from './context/RefDataContext';
import TabWorkspace from './components/TabWorkspace';

const App = () => {
  const { 
  searchName, setSearchName, 
  refNo, setRefNo, 
  nvBusId, setNvBusId,
  results, selectedRecord, setSelectedRecord, 
  isLoading, handleSearch,
  refreshSelectedRecord,
  bulkCache,          // ← add this
} = useOwnershipSearch();
  
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const passedRef = urlParams.get('referenceNumber');
  const [hideSearch] = useState(!!passedRef);
  const [searchInitiated, setSearchInitiated] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil((results?.length || 0) / itemsPerPage);
  const currentResults = (results || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Auto-search for direct navigation
  useEffect(() => {
    if (hideSearch && passedRef) {
      if (refNo !== passedRef) {
        setRefNo(passedRef);
      } else if (!searchInitiated) {
        setSearchInitiated(true);
        handleSearch();
      }
    }
  }, [refNo, passedRef, hideSearch, setRefNo, handleSearch, searchInitiated]);

  // Auto-select first result
  useEffect(() => {
    if (hideSearch && results?.length > 0 && !selectedRecord) {
      setSelectedRecord(results[0]);
    }
  }, [results, hideSearch, selectedRecord, setSelectedRecord]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      handleSearch();
    }
  };

  const handleDone = () => {
    if (window.parent) window.parent.postMessage("refreshAccela", "*");
  };

  return (
    <RefDataProvider>
      <div className="min-h-screen bg-slate-100 font-sans text-slate-700 pb-12">
        {!hideSearch && (
          <nav className="bg-[#1e3a8a] shadow-lg">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-6">
                  <img src={logo} alt="Logo" className="h-20 w-auto object-contain" />
                </div>
                <h1 className="text-white text-2xl font-bold tracking-tight">Ownership Portal</h1>
              </div>
            </div>
          </nav>
        )}

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {!hideSearch && (
            <>
              <SearchControls 
                searchName={searchName} setSearchName={setSearchName}
                refNo={refNo} setRefNo={setRefNo}
                nvBusId={nvBusId} setNvBusId={setNvBusId}
                handleSearch={() => { setCurrentPage(1); handleSearch(); }} 
                handleKeyDown={handleKeyDown}
              />

              <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#24417a] text-white uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Reference No.</th>
                      <th className="px-4 py-3 font-medium">NV Business ID</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResults.length > 0 ? currentResults.map((row: any, i: number) => (
                      <tr 
                        key={row.referenceNbr || i} 
                        onClick={() => setSelectedRecord(row)}
                        className={`cursor-pointer border-b transition-colors ${selectedRecord?.referenceNbr === row.referenceNbr ? 'bg-[#913728] text-white' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-4 py-3 font-bold uppercase">{row.ownerName}</td>
                        <td className="px-4 py-3">{row.referenceNbr}</td>
                        <td className="px-4 py-3">{row.nvBusinessId}</td>
                        <td className="px-4 py-3">{row.contactType}</td>
                        <td className="px-4 py-3 uppercase">{[row.contactAddress, row.city, row.state, row.zip, row.country].filter(Boolean).join(", ")}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">{isLoading ? 'Fetching records...' : 'No search results to display'}</td></tr>
                    )}
                  </tbody>
                </table>
                {results?.length > 0 && (
                  <div className="border-t border-slate-100">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="w-full mt-8">
            {hideSearch && (!searchInitiated || isLoading || (results?.length > 0 && !selectedRecord)) ? (
              <div className="bg-white p-20 text-center rounded-lg border border-dashed text-slate-400 italic">Searching and loading record details...</div>
            ) : !selectedRecord ? (
              <div className="bg-white p-20 text-center rounded-lg border border-dashed text-slate-400 italic">
                {hideSearch ? "No record found for the provided reference number." : "Select a record from the search results to visualize its structure."}
              </div>
            ) : (
             <TabWorkspace 
                selectedRecord={selectedRecord} 
                onRefresh={refreshSelectedRecord}
                bulkCache={bulkCache}   // ← add this
              />
            )}
          </div>

          {hideSearch && (
            <div className="flex justify-center pt-8 border-t border-slate-200">
              <button onClick={handleDone} className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-12 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl transform active:scale-95">
                <CheckCircle size={20} /> Done
              </button>
            </div>
          )}
        </div>
      </div>
    </RefDataProvider>
  );
};

export default App;