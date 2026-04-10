import React, { useState, useEffect } from 'react';
import { ChevronDown, Eye, Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react'; 
import { normalizeEntity } from '../utils/normalize';
import { API_BASE_URL } from '../config';
import OwnerDetailsCard from "./OwnerDetailsCard";
import AddOwnerForm from "./AddOwnerForm";

interface OwnershipListProps {
  entity: any; 
  depth?: number;
  onRefresh?: () => Promise<void> | void; 
  parentRefNbr?: string; 
  isReadOnly?: boolean; // <-- Added isReadOnly prop
}

const OwnershipList: React.FC<OwnershipListProps> = ({ 
  entity, 
  depth = 0, 
  onRefresh,
  parentRefNbr = "0",
  isReadOnly = false // <-- Added default value
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  // Custom Delete Modal State: Now stores both target and parentRefNbr
  const [deleteContext, setDeleteContext] = useState<{ target: any, parentRefNbr: string } | null>(null);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [localChildren, setLocalChildren] = useState<any[]>(
    entity?.relatedContacts || []
  );

  useEffect(() => {
    setLocalChildren(entity?.relatedContacts || []);
  }, [entity]);

  // Auto-hide the success toast after 4 seconds
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

  // --- HANDLER: Trigger Delete Modal ---
  const handleDeleteClick = (target: any, parentRef: string) => {
    if (isReadOnly) return; // <-- Prevent click if read-only
    setDeleteContext({ target, parentRefNbr: parentRef });
  };

  // --- HANDLER: Execute Actual Deletion ---
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
      setDeleteContext(null); // Close the modal
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
      "Country" : "United States",
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
      
      {/* Loading Overlay */}
      {isLoading && !deleteContext && (
        <div className="absolute inset-0 bg-white/60 z-[50] flex items-center justify-center rounded-md">
           <Loader2 className="animate-spin text-[#2c3e76]" size={32} />
        </div>
      )}

      {/* Success Toast */}
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
          
          {/* Over-allocation warning on the Parent Card if legacy data is broken */}
          {childrenTotalPercentage > 100 && (
            <div className="bg-red-50 px-3 py-2 border-b border-red-200 text-red-700 text-xs font-semibold">
              Warning: Children exceed 100% total ({childrenTotalPercentage}%). Please adjust ownership.
            </div>
          )}

          <div className="flex items-center justify-between p-3 border-b bg-slate-50/30">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                {isIndividual ? "👤" : "🏢"}
              </span>
              <h4 className="font-bold text-[#1a2b4b] text-sm uppercase">{current.ownerName}</h4>
            </div>
            <div className="flex items-center gap-3">
              <Eye className="cursor-pointer text-gray-400 hover:text-[#24417a] transition-colors" 
                onClick={() => setSelectedOwner({ 
                    ...current, 
                    parentRefNbr: parentRefNbr 
                    // No isChildOfCurrent flag here, so it doesn't run sibling validation on itself!
                })} 
              />
              {!isIndividual && (
                <button 
                  onClick={() => { if (!isReadOnly) setIsAdding(true); }} // <-- Prevent click if read-only
                  disabled={isLoading || isReadOnly} // <-- Disable button if read-only
                  title={isReadOnly ? "Read Only Mode" : (childrenTotalPercentage >= 100 ? "Add a child entity with percentage set to 0%" : "Add a child entity")}
                  className={`bg-[#24417a] text-white px-3 py-1 text-xs flex items-center gap-1 font-bold rounded-sm shadow-sm transition-colors ${
                    isReadOnly || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1a315e]'
                  }`} // <-- Update classes for disabled visual state
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Child List Summary */}
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
                            isChildOfCurrent: true // <-- ADDED FLAG
                        });
                      }} 
                    />
                    {/* Updated Trash Icon: Keeps it visible but disables it if read-only */}
                    <Trash2 
                      size={18} 
                      className={`${isReadOnly ? 'text-slate-200 opacity-50 cursor-not-allowed' : 'cursor-pointer text-slate-300 hover:text-red-600'} transition-colors`} 
                      onClick={() => handleDeleteClick(child, current.referenceNbr)} 
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
                  isReadOnly={isReadOnly} // <-- Pass down to recursive children
              />
            </div>
          ))}
        </div>
      )}

      {/* Modals & Overlays */}
      {/* If your AddOwnerForm also needs to block submissions over 100%, pass currentTotalPercentage to it here too! */}
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
            currentTotalPercentage={selectedOwner.isChildOfCurrent ? childrenTotalPercentage : undefined}
            isReadOnly={isReadOnly} // <-- Pass down to details card so it knows to disable edit fields
        />
      )}

      {/* --- ACCELA THEMED DELETE CONFIRMATION MODAL --- */}
      {deleteContext && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Accela Blue Header */}
            <div className="bg-[#24417a] px-5 py-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-white" />
              <h3 className="text-white font-semibold text-sm tracking-wide">Confirm Deletion</h3>
            </div>
            
            <div className="p-6">
              <p className="text-slate-700">
                Are you sure you want to remove <span className="font-bold text-[#1a2b4b]">{deleteContext.target.ownerName || deleteContext.target.firstName}</span> from the ownership structure?
              </p>
              <p className="text-sm text-slate-500 mt-2">
                This action cannot be undone and will immediately update the server.
              </p>
            </div>
            
            <div className="bg-slate-50 px-5 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setDeleteContext(null)}
                disabled={isLoading}
                className="px-4 py-2 rounded text-sm font-semibold text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isLoading}
                className="px-4 py-2 rounded text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isLoading ? 'Deleting...' : 'Delete Owner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnershipList;