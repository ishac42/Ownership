import React, { useState, useEffect } from 'react';
import { ChevronDown, Eye, Plus, Loader2, Trash2, AlertTriangle, Users } from 'lucide-react'; 
import { normalizeEntity } from '../utils/normalize';
import { API_BASE_URL } from '../config';
import OwnerDetailsCard from "./OwnerDetailsCard";
import AddOwnerForm from "./AddOwnerForm";

interface OwnershipListProps {
  entity: any; 
  depth?: number;
  onRefresh?: () => Promise<void> | void; 
  parentRefNbr?: string; 
}

const OwnershipList: React.FC<OwnershipListProps> = ({ 
  entity, 
  depth = 0, 
  onRefresh,
  parentRefNbr = "0" 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteContext, setDeleteContext] = useState<{ target: any, parentRefNbr: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [localChildren, setLocalChildren] = useState<any[]>(
    entity?.relatedContacts || []
  );

  useEffect(() => {
    setLocalChildren(entity?.relatedContacts || []);
  }, [entity]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // --- CALCULATE TOTAL % OF CHILDREN ---
  const childrenTotalPercentage = localChildren.reduce((sum, child) => {
    const pct = parseFloat(String(child.percentage || '0').replace('%', '')) || 0;
    return sum + pct;
  }, 0);

  if (!entity) return null;
  const current = normalizeEntity(entity);
  const isIndividual = (current.ownershipType || "").toLowerCase().includes('individual');

  const handleDeleteClick = (target: any, parentRef: string) => {
    setDeleteContext({ target, parentRefNbr: parentRef });
  };

  const confirmDelete = async () => {
    if (!deleteContext) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/delete-owner`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          referenceNbr: deleteContext.target.referenceNumber,
          parentRefNbr: deleteContext.parentRefNbr 
        }),
      });
      if (response.ok) {
        setSuccessMessage(`Deleted successfully`);
        if (onRefresh) await onRefresh();
      } else {
        alert("Failed to delete.");
      }
    } catch (error) {
      alert("Error connecting to server.");
    } finally {
      setIsLoading(false);
      setDeleteContext(null);
    }
  };

  const handleAddOwner = async (formData: any) => {
    setIsLoading(true);
    const payload = [{
      "Business Phone": formData.phone,
      "Type": formData.ownershipType,
      "Title": formData.type || "Owner",
      "Percent Owned": formData.percentage,
      "Entity Name": formData.ownerName,
      "First Name": formData.firstName,
      "Last Name": formData.lastName,
      "E-mail": formData.email,
      "Address Line 1": formData.ownershipAddr,
      "Unit Type": "",
      "Unit/Suite/Apt" : "Unit/Suite/Apt",
      "Country" : formData.country || "United States",
      "City": formData.city,
      "State": formData.state,
      "ZIP Code/Province Postal Code": formData.zip
    }];

    try {
      const response = await fetch(`${API_BASE_URL}/api/add-owner`, {
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
      {isLoading && !deleteContext && (
        <div className="absolute inset-0 bg-white/60 z-[50] flex items-center justify-center rounded-md">
           <Loader2 className="animate-spin text-[#2c3e76]" size={32} />
        </div>
      )}

      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out">
          <div className="bg-green-600 text-white px-8 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center gap-4 border border-green-400">
            <div className="bg-white/20 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-bold tracking-wide">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-4 text-white/70 hover:text-white text-xl font-bold">×</button>
          </div>
        </div>
      )}

      {localChildren.length > 0 && isExpanded && (
        <div className="absolute border-l-2 border-slate-200 z-10" style={{ left: '11px', top: '37px', bottom: '25px' }} />
      )}

      <div className="flex items-start gap-4">
        <div className="relative flex flex-col items-center flex-shrink-0 w-6">
          {localChildren.length > 0 ? (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mt-[13px] w-6 h-6 border border-slate-300 flex items-center justify-center bg-white z-20 shadow-sm cursor-pointer">
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${!isExpanded ? '-rotate-90' : ''}`} />
            </button>
          ) : (
            <div className="mt-[19px] w-3 h-3 bg-[#24417a] z-20" />
          )}
        </div>

        <div className="flex-1 bg-white border border-slate-200 shadow-sm overflow-hidden mb-6 z-20">
          <div className="flex items-center justify-between p-3 border-b bg-slate-50/30">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                {isIndividual ? "👤" : "🏢"}
              </span>
              <h4 className="font-bold text-[#1a2b4b] text-sm uppercase">{current.ownerName}</h4>
            </div>
            
            <div className="flex items-center gap-3">
              {/* NEW: Sum of Children Label */}
              {!isIndividual && localChildren.length > 0 && (
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${
                  childrenTotalPercentage > 100 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <Users size={12} />
                  <span>Total: {childrenTotalPercentage}%</span>
                </div>
              )}
              <Eye className="cursor-pointer text-gray-400 hover:text-[#24417a] transition-colors" 
                onClick={() => setSelectedOwner({ 
                    ...current, 
                    parentRefNbr: parentRefNbr,
                    totalChildrenPercentage: childrenTotalPercentage
                })} 
              />
              {!isIndividual && (
                <button 
                  onClick={() => setIsAdding(true)}
                  disabled={isLoading }
                  className="bg-[#24417a] text-white px-3 py-1 text-xs flex items-center gap-1 font-bold hover:bg-[#1a315e] transition-colors rounded-sm shadow-sm disabled:opacity-50"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
          </div>

          {isExpanded && localChildren.length > 0 && (
            <div className="divide-y divide-slate-50">
              {localChildren.map((child, idx) => (
                <div key={idx} className="grid grid-cols-[30px_1fr_120px_60px_80px] items-center py-3 px-4 hover:bg-slate-50 transition-colors">
                  <span className="text-sm text-slate-500">{idx + 1}.</span>
                  <span className="text-sm font-semibold text-slate-700 truncate">{child.ownerName || child.firstName}</span>
                  <span className="text-sm text-slate-400 font-bold uppercase text-[10px]">{child.contactType}</span>
                  <span className="text-sm font-bold text-slate-700 text-right">{child.percentage}%</span>
                  <div className="flex justify-end gap-3">
                    <Eye className="cursor-pointer text-gray-400 hover:text-[#24417a] transition-colors" 
                      onClick={() => {
                        const normalizedChild = normalizeEntity(child);
                        setSelectedOwner({ 
                            ...normalizedChild,
                            parentRefNbr: current.referenceNbr,
                            isChildOfCurrent: true
                        });
                      }} 
                    />
                    <Trash2 
                      size={18} 
                      className="cursor-pointer text-slate-300 hover:text-red-600 transition-colors" 
                      onClick={() => handleDeleteClick(child, current.referenceNbr)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

      {isAdding && (
        <AddOwnerForm 
          onCancel={() => setIsAdding(false)} 
          onSave={handleAddOwner} 
          currentTotalPercentage={childrenTotalPercentage} 
        />
      )}
      
      {selectedOwner && (
      <OwnerDetailsCard 
            owner={selectedOwner} 
            onClose={() => setSelectedOwner(null)} 
            onRefresh={() => { if (onRefresh) onRefresh(); }}
            currentTotalPercentage={selectedOwner.isChildOfCurrent ? childrenTotalPercentage : selectedOwner.totalChildrenPercentage}
            isFromList = {true}
        />
      )}

      {deleteContext && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#24417a] px-5 py-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-white" />
              <h3 className="text-white font-semibold text-sm tracking-wide">Confirm Deletion</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-700">
                Are you sure you want to remove <span className="font-bold text-[#1a2b4b]">{deleteContext.target.ownerName || deleteContext.target.firstName}</span>?
              </p>
            </div>
            <div className="bg-slate-50 px-5 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setDeleteContext(null)} className="px-4 py-2 rounded text-sm font-semibold text-slate-600 border border-slate-300">
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded text-sm font-semibold bg-red-600 text-white flex items-center gap-2">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete Owner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnershipList;