import { useState } from 'react';
import logo from './Logo.jpg'; 
import { List, BarChart3 } from 'lucide-react';
import { useOwnershipSearch } from './hooks/useOwnership';
import SearchControls from './components/SearchControls';
import OwnershipList from './components/OwnershipList';
import OwnershipChart from './components/OwnershipChart';
import Pagination from './components/Pagination'; 
import { RefDataProvider } from './context/RefDataContext';

interface OwnerRecord {
  ownerName?: string;
  referenceNbr?: string;
  contactType?: string;
  contactAddress?: string;
}

const App = () => {
  const { 
    searchName, setSearchName, 
    refNo, setRefNo, 
    results, selectedRecord, setSelectedRecord, 
    isLoading, handleSearch,
    refreshSelectedRecord 
  } = useOwnershipSearch();
  
  const [viewMode, setViewMode] = useState('list');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination Logic
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const currentResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setCurrentPage(1); // Reset to page 1 on new search
      handleSearch();
    }
  };

  return (
    <RefDataProvider>
      <div className="min-h-screen bg-slate-100 font-sans text-slate-700">
        {/* Navigation Bar */}
        <nav className="bg-[#1e3a8a] shadow-lg">
          {/* FIX: Changed 'auto' to 'mx-auto' below to center the header content */}
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
            <div className="mr-6">
              <img src={logo} alt="Logo" className="h-20 w-auto object-contain" />
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Ownership Portal</h1>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          
          {/* Component 1: Search Controls */}
          <SearchControls 
            searchName={searchName} setSearchName={setSearchName}
            refNo={refNo} setRefNo={setRefNo}
            handleSearch={() => { setCurrentPage(1); handleSearch(); }} 
            handleKeyDown={handleKeyDown}
          />

          {/* Component 2: Results Table + Pagination */}
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
                {currentResults.length > 0 ? currentResults.map((row: OwnerRecord, i: number) => (
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

            {/* Pagination Controls */}
            {results.length > 0 && (
              <div className="border-t border-slate-100">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>

          {/* View Selection (List vs Chart) */}
          <div className="flex justify-between items-center pt-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase">Entity Details</h2>
            <div className="flex border rounded shadow-sm bg-white overflow-hidden">
              <button onClick={() => setViewMode('list')} 
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold ${viewMode === 'list' ? 'bg-[#24417a] text-white' : 'text-slate-600'}`}>
                <List size={14} /> List View
              </button>
              <button onClick={() => setViewMode('chart')} 
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold 
                ${viewMode === 'chart' ? 'bg-[#24417a] text-white' : 'text-slate-600'}`}>
                <BarChart3 size={14} /> Chart View
              </button>
            </div>
          </div>

          {/* Component 3: Visualization Area */}
          <div className="w-full">
            {!selectedRecord ? (
              <div className="bg-white p-20 text-center rounded-lg border border-dashed text-slate-400 italic">
                Select a record from the search results to visualize its structure.
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
        </div>
      </div>
    </RefDataProvider>
  );
};

export default App;