import React from 'react';
import { Search } from 'lucide-react';

interface SearchControlsProps {
  searchName: string;
  setSearchName: (value: string) => void;
  refNo: string;
  setRefNo: (value: string) => void;
  nvBusId: string;
  setNvBusId: (value: string) => void;
  handleSearch: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const SearchField = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  onKeyDown,
  onSearch,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearch: () => void;
}) => (
  <div className="relative">
    <label htmlFor={id} className="sr-only">{label}</label>
    <input
      id={id}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className="w-full pl-3 pr-10 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
    />
    <button
      onClick={onSearch}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-blue-600"
      type="button"
      aria-label={`Submit ${label.toLowerCase()} search`}
    >
      <Search size={18} aria-hidden="true" />
    </button>
  </div>
);

const SearchControls: React.FC<SearchControlsProps> = ({
  searchName,
  setSearchName,
  refNo,
  setRefNo,
  nvBusId,
  setNvBusId,
  handleSearch,
  handleKeyDown,
}) => (
  <section aria-label="Search ownership records" className="flex flex-col md:flex-row gap-4 items-end bg-white p-5 rounded-lg shadow-sm border border-slate-200">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
      <SearchField
        id="search-name"
        label="Name"
        placeholder="Search by name..."
        value={searchName}
        onChange={(e) => setSearchName(e.target.value)}
        onKeyDown={handleKeyDown}
        onSearch={handleSearch}
      />
      <SearchField
        id="search-ref-no"
        label="Reference Number"
        placeholder="Search by ref no..."
        value={refNo}
        onChange={(e) => setRefNo(e.target.value)}
        onKeyDown={handleKeyDown}
        onSearch={handleSearch}
      />
      <SearchField
        id="search-nv-business-id"
        label="NV Business ID"
        placeholder="Search by NV Business ID..."
        value={nvBusId}
        onChange={(e) => setNvBusId(e.target.value)}
        onKeyDown={handleKeyDown}
        onSearch={handleSearch}
      />
    </div>
  </section>
);

export default SearchControls;