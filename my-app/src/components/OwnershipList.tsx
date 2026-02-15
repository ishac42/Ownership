import { useState, useEffect, type FC } from 'react';
import { ChevronDown, Eye, Plus, Loader2 } from 'lucide-react'; 
import { normalizeEntity } from '../utils/normalize';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
import OwnerDetailsCard from "./OwnerDetailsCard";
import AddOwnerForm from "./AddOwnerForm";

interface OwnershipListProps {
  entity: any; 
  depth?: number;
  onRefresh?: () => Promise<void> | void; 
  parentRefNbr?: string; 
}

const OwnershipList: FC<OwnershipListProps> = ({ 
  entity, 
  depth = 0, 
  onRefresh,
  parentRefNbr = "0" 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [localChildren, setLocalChildren] = useState<any[]>(
    entity?.relatedContacts || []
  );

  useEffect(() => {
    setLocalChildren(entity?.relatedContacts || []);
  }, [entity]);

  // ✅ ADDED: Auto-hide the success toast after 4 seconds (Same as Card)
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // 1. NORMALIZE THE TOP LEVEL ENTITY
  if (!entity) return null;
  const current = normalizeEntity(entity);

  const handleAddOwner = async (formData: any) => {
    setIsLoading(true);
    
    const payload = [{
      "Business Phone": formData.phone,
      "Type": formData.ownershipType,
      "Title": formData.type || "Owner",
      "Percent Owned": formData.percentage,
      "Entity Name": formData.ownerName,
      "First Name": "",
      "Last Name": "",
      "E-mail": formData.email,
      "Address Line 1": formData.ownershipAddr,
      "Unit/Suite/Apt" : "Unit/Suite/Apt",
      "Country" : "United States",
      "City": formData.city,
      "State": formData.state,
      "ZIP Code/Province Postal Code": formData.zip
    }];

    try {
      const response = await fetch(`${API_URL}/api/add-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAsitArr: JSON.stringify(payload),
          fein: formData.fein,
          ssn: formData.ssn,
          parentRefNbr : current.referenceNbr 
        }),
      });

      if (response.ok) {
        setIsAdding(false);
        setIsExpanded(true);
        setSuccessMessage(`Owner: ${formData.ownerName} added successfully`);
        if (onRefresh) await onRefresh(); 
      } else {
        alert("Failed to add owner.");
      }
    } catch (error) {
      console.error(error);
      alert("Backend error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col relative">
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 z-[50] flex items-center justify-center rounded-md">
           <Loader2 className="animate-spin text-[#2c3e76]" size={32} />
        </div>
      )}

      {/* ✅ UPDATED: Success Toast (Green Style matching Card) */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out">
          <div className="bg-green-600 text-white px-8 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center gap-4 border border-green-400">
            <div className="bg-white/20 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-bold tracking-wide">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="ml-4 text-white/70 hover:text-white text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Connection Line */}
      {localChildren.length > 0 && isExpanded && (
        <div className="absolute border-l-2 border-slate-200 z-10" style={{ left: '11px', top: '37px', bottom: '25px' }} />
      )}

      <div className="flex items-start gap-4">
        {/* Toggle */}
        <div className="relative flex flex-col items-center flex-shrink-0 w-6">
          {localChildren.length > 0 ? (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mt-[13px] w-6 h-6 border border-slate-300 flex items-center justify-center bg-white z-20 shadow-sm cursor-pointer">
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${!isExpanded ? '-rotate-90' : ''}`} />
            </button>
          ) : (
            <div className="mt-[19px] w-3 h-3 bg-[#24417a] z-20" />
          )}
        </div>

        {/* Main Card */}
        <div className="flex-1 bg-white border border-slate-200 shadow-sm overflow-hidden mb-6 z-20">
          <div className="flex items-center justify-between p-3 border-b bg-slate-50/30">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                {current.ownershipType.toLowerCase().includes("individual") ? "👤" : "🏢"}
              </span>
              <h4 className="font-bold text-[#1a2b4b] text-sm uppercase">{current.ownerName}</h4>
            </div>
            <div className="flex items-center gap-3">
              {/* VIEW PARENT (Main Card) */}
              <Eye className="cursor-pointer text-gray-400 hover:text-blue-600" 
                onClick={() => setSelectedOwner({ 
                    ...current, 
                    parentRefNbr: parentRefNbr 
                })} 
              />
              <button 
                onClick={() => setIsAdding(true)}
                disabled={isLoading}
                className="bg-[#24417a] text-white px-3 py-1 text-xs flex items-center gap-1 font-bold hover:bg-[#1a315e]"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* Child List Summary */}
          {isExpanded && localChildren.length > 0 && (
            <div className="divide-y divide-slate-50">
              {localChildren.map((child, idx) => (
                <div key={idx} className="grid grid-cols-[30px_1fr_120px_60px_40px] items-center py-3 px-4 hover:bg-slate-50">
                  <span className="text-sm text-slate-500">{idx + 1}.</span>
                  <span className="text-sm font-semibold text-slate-700 truncate">{child.ownerName || child.firstName}</span>
                  <span className="text-sm text-slate-400 font-bold uppercase text-[10px]">{child.contactType}</span>
                  <span className="text-sm font-bold text-slate-700 text-right">{child.percentage}%</span>
                  <div className="flex justify-end">
                    <Eye className="cursor-pointer text-gray-400 hover:text-blue-600" 
                      onClick={() => {
                        const normalizedChild = normalizeEntity(child);
                        setSelectedOwner({ 
                            ...normalizedChild,
                            parentRefNbr: current.referenceNbr 
                        });
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recursive Children */}
      {localChildren.length > 0 && isExpanded && (
        <div className="ml-[11px] pl-8 relative">
          {localChildren.map((child: any, idx: number) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[32px] top-0 bottom-0 w-[32px]">
                <div className="absolute left-0 top-[25px] w-full h-[2px] bg-slate-200" />
              </div>
              <OwnershipList 
                  entity={child} 
                  depth={depth + 1} 
                  onRefresh={onRefresh} 
                  parentRefNbr={current.referenceNbr}
              />
            </div>
          ))}
        </div>
      )}

      {isAdding && <AddOwnerForm onCancel={() => setIsAdding(false)} onSave={handleAddOwner} />}
      
      {selectedOwner && (
        <OwnerDetailsCard 
            owner={selectedOwner} 
            onClose={() => setSelectedOwner(null)} 
            onRefresh={onRefresh} 
        />
      )}
    </div>
  );
};

export default OwnershipList;