import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // If the box is empty, don't update yet (allows user to delete and re-type)
    if (value === "") return;

    const val = parseInt(value);
    // Ensure the number is between 1 and the total pages
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onPageChange(val);
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-white">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-700 text-sm">Page</span>
        <input
          type="number"
          min="1"
          value={currentPage || ""}
          onChange={handleInputChange}
          /* "no-spinner" class removes the up/down arrows */
          className="no-spinner w-10 h-8 border border-slate-300 rounded text-center focus:outline-none focus:border-blue-500 text-sm"
        />
        <span className="text-slate-600 text-sm">of {totalPages || 1}</span>
      </div>
      
      <div className="flex border border-slate-300 rounded overflow-hidden shadow-sm">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 border-r border-slate-300 hover:bg-slate-50 disabled:opacity-30 bg-white"
        >
          <ChevronLeft size={18} className="text-slate-400" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1 hover:bg-slate-50 disabled:opacity-30 bg-white"
        >
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;