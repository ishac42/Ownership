import { type FC, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';

interface SearchControlsProps {
  searchName: string;
  setSearchName: (value: string) => void;
  refNo: string;
  setRefNo: (value: string) => void;
  handleSearch: () => void;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

const SearchControls: FC<SearchControlsProps> = ({ 
  searchName, 
  setSearchName, 
  refNo, 
  setRefNo, 
  handleSearch, 
  handleKeyDown 
}) => (
  <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-5 rounded-lg shadow-sm border border-slate-200">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
      {/* Name Search Input */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search by name..." 
          value={searchName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-3 pr-10 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
        />
        <button 
          onClick={handleSearch} 
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600"
          type="button"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Reference Number Input */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search by ref no..." 
          value={refNo}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefNo(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-3 pr-10 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
        />
        <button 
          onClick={handleSearch} 
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600"
          type="button"
        >
          <Search size={18} />
        </button>
      </div>
    </div>
  </div>
);

export default SearchControls;