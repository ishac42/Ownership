import React, { useState, useEffect } from 'react';
import { Eye, Plus, ChevronDown, User, Building2 } from 'lucide-react';
import { normalizeEntity } from '../utils/normalize';

// 1. Updated Interface to accept parentRefNbr
interface RecursiveTreeProps {
  entity: any;
  onViewDetails: (entity: any, parentRefNbr?: string) => void;
  onOpenAdd: (parentEntity: any) => void;
  parentRefNbr?: string; // <--- NEW PROP
}

export const RecursiveTree: React.FC<RecursiveTreeProps> = ({ 
  entity, 
  onViewDetails, 
  onOpenAdd,
  parentRefNbr = "" // Default to empty if not provided (top level)
}) => {
  const [localChildren, setLocalChildren] = useState<any[]>(entity?.relatedContacts || []);
  const current = normalizeEntity(entity);
  const isIndividual = (current.ownershipType || "").toLowerCase().includes('individual');
  const nodeBgColor = isIndividual ? 'bg-[#267471] border-[#1e5c5a]' : 'bg-[#792454] border-[#611d43]';

  useEffect(() => { setLocalChildren(entity?.relatedContacts || []); }, [entity]);

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className={`relative z-10 w-68 p-4 rounded-lg shadow-xl text-white transition-transform duration-200 ${nodeBgColor} border-b-4 hover:-translate-y-1`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col overflow-hidden mr-2">
            <h4 className="text-xs font-bold uppercase truncate" title={current.ownerName}>{current.ownerName}</h4>
            
          </div>
          <div className="bg-black/20 rounded px-2 py-0.5 min-w-[3rem] flex justify-center">
            <span className="text-xs font-bold">{current.percentage}%</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 opacity-90">
            {isIndividual ? <User size={12} /> : <Building2 size={12} />}
            <span className="text-[10px] font-semibold tracking-wide">
              {isIndividual ? "Individual" : current.contactType}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                // 2. Pass the PARENT reference ID to the handler
                onViewDetails(current, parentRefNbr); 
              }}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors group"
            >
              <Eye size={14} className="opacity-80 group-hover:opacity-100" />
            </button>
            
            {!isIndividual && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenAdd(current); }}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/25 px-2 py-1 rounded transition-colors border border-white/10"
              >
                <Plus size={10} strokeWidth={3} />
                <span className="text-[9px] font-bold uppercase">Add</span>
              </button>
            )}
          </div>
        </div>
        
        {localChildren.length > 0 && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-400 rounded-full p-0.5 shadow-sm border border-slate-200">
            <ChevronDown size={12} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Recursive Children Rendering */}
      {localChildren.length > 0 && (
        <>
          <div className="w-px h-8 bg-slate-300" />
          <div className="flex justify-center items-start pt-4 relative">
            {localChildren.map((child, idx) => (
              <div key={idx} className="flex flex-col items-center px-4 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-slate-300" />
                {idx !== 0 && <div className="absolute -top-4 left-0 w-1/2 h-px bg-slate-300" />}
                {idx !== localChildren.length - 1 && <div className="absolute -top-4 right-0 w-1/2 h-px bg-slate-300" />}
                
                {/* 3. Pass props recursively */}
                <RecursiveTree 
                  entity={child} 
                  onViewDetails={onViewDetails} 
                  onOpenAdd={onOpenAdd} 
                  // KEY FIX: The current node is the parent of the next node
                  parentRefNbr={current.referenceNbr}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};