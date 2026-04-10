import { useState, useEffect, type KeyboardEvent } from 'react';
import logo from './Logo.jpg'; 
import { List, BarChart3, CheckCircle } from 'lucide-react';
import { useOwnershipSearch } from './hooks/useOwnership';
import SearchControls from './components/SearchControls';
import OwnershipList from './components/OwnershipList';
import OwnershipChart from './components/OwnershipChart';
import Pagination from './components/Pagination'; 
import { RefDataProvider } from './context/RefDataContext';

const App = () => {
  const { 
    searchName, setSearchName, 
    refNo, setRefNo, 
    results, selectedRecord, setSelectedRecord, 
    isLoading, handleSearch,
    refreshSelectedRecord 
  } = useOwnershipSearch();
  
  const [viewMode, setViewMode] = useState('list');
  
  // 1. Initialize Direct Mode synchronously from URL query string
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const passedRef = urlParams.get('referenceNumber');
  const [hideSearch] = useState(!!passedRef);
  
  // 2. Track search lifecycle to manage loading UI correctly
  const [searchInitiated, setSearchInitiated] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil((results?.length || 0) / itemsPerPage);
  const currentResults = (results || []).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 3. EFFECT: Automatic Search Trigger
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

  // 4. EFFECT: Automatic Selection
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
    // If the window was opened as a popup, close it. Otherwise, redirect.
    if (window.parent) {
      window.parent.postMessage("refreshAccela", "*");
    }
  };

  return (
    <RefDataProvider>
      <div className="min-h-screen bg-slate-100 font-sans text-slate-700 flex flex-col">
        
        {/* --- Header (Hidden if URL has referenceNumber) --- */}
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

        <div className="max-w-7xl w-full mx-auto p-6 space-y-6 flex-grow">
          
          {/* Section 1: Search & Table (Only rendered if no referenceNumber in URL) */}
          {!hideSearch && (
            <>
              <SearchControls 
                searchName={searchName} setSearchName={setSearchName}
                refNo={refNo} setRefNo={setRefNo}
                handleSearch={() => { setCurrentPage(1); handleSearch(); }} 
                handleKeyDown={handleKeyDown}
              />

              <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#24417a] text-white uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Reference No.</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResults.length > 0 ? currentResults.map((row: any, i: number) => (
                      <tr 
                        key={row.referenceNbr || i} 
                        onClick={() => setSelectedRecord(row)}
                        className={`cursor-pointer border-b transition-colors ${
                          selectedRecord?.referenceNbr === row.referenceNbr 
                          ? 'bg-[#913728] text-white' 
                          : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-bold uppercase">{row.ownerName}</td>
                        <td className="px-4 py-3">{row.referenceNbr}</td>
                        <td className="px-4 py-3">{row.contactType}</td>
                        <td className="px-4 py-3 uppercase">{row.contactAddress}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="p-10 text-center text-slate-400 italic">
                          {isLoading ? 'Fetching records...' : 'No search results to display'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {results?.length > 0 && (
                  <div className="border-t border-slate-100">
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Section 2: View Controls */}
          <div className="flex justify-between items-center pt-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase">Entity Details</h2>
            <div className="flex border rounded shadow-sm bg-white overflow-hidden">
              <button onClick={() => setViewMode('list')} 
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold ${viewMode === 'list' ? 'bg-[#24417a] text-white' : 'text-slate-600'}`}>
                <List size={14} /> List View
              </button>
              <button onClick={() => setViewMode('chart')} 
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold ${viewMode === 'chart' ? 'bg-[#24417a] text-white' : 'text-slate-600'}`}>
                <BarChart3 size={14} /> Chart View
              </button>
            </div>
          </div>

          {/* Section 3: Visualization Area */}
          <div className="w-full">
            {hideSearch && (!searchInitiated || isLoading || (results?.length > 0 && !selectedRecord)) ? (
              <div className="bg-white p-20 text-center rounded-lg border border-dashed text-slate-400 italic">
                Searching and loading record details...
              </div>
            ) : !selectedRecord ? (
              <div className="bg-white p-20 text-center rounded-lg border border-dashed text-slate-400 italic">
                {hideSearch 
                  ? "No record found for the provided reference number." 
                  : "Select a record from the search results to visualize its structure."}
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner min-h-[400px]">
                {viewMode === 'list' ? (
                  <OwnershipList 
                      entity={selectedRecord} 
                      onRefresh={refreshSelectedRecord} 
                  />
                ) : (
                  <div className="overflow-x-auto pb-10 flex justify-center">
                    <OwnershipChart 
                      entity={selectedRecord} 
                      onRefresh={refreshSelectedRecord} 
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Done Button (Moved down, visible only if URL has referenceNumber) */}
          {hideSearch && (
            <div className="flex justify-end pt-4 pb-8">
              <button
                onClick={handleDone}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-md font-bold transition-colors shadow-md text-lg"
              >
                <CheckCircle size={20} />
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </RefDataProvider>
  );
};

export default App;