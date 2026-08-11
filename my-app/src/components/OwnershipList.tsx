import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Eye, Plus, Loader2, Trash2, AlertTriangle, Users, Layers } from 'lucide-react'; 
import { normalizeEntity } from '../utils/normalize';
import { API_BASE_URL } from '../config';
import OwnerDetailsCard from "./OwnerDetailsCard";
import AddOwnerForm from "./AddOwnerForm";
import { buildAddOwnerPayload } from '../utils/ownerPayload';
import ShowTerminatedToggle from './ShowTerminatedToggle';
import { useOwnershipStatus } from '../context/OwnershipStatusContext';
import {
  filterContactsForDisplay,
  sumActiveChildPercentages,
  hasInvalidOwnershipTotal,
  countTerminatedInSubtree,
  isOwnershipAsitRow,
  getOwnerReferenceNbr,
} from '../utils/ownershipStatus';
import { prepareOwnershipChildren } from '../utils/ownershipTree';

interface OwnershipListProps {
  entity: any; 
  depth?: number;
  onRefresh?: () => Promise<void> | void;
  onOwnerUpdated?: (refNbr: string, updates: Record<string, unknown>) => void;
  parentRefNbr?: string;
  onViewRelated?: (entity: any) => void;
  isReverseRelation?: boolean;    
  reverseData?: any[] | null;
  expandedNodes?: Record<string, boolean>;
  setExpandedNodes?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const OwnershipList: React.FC<OwnershipListProps> = ({ 
  entity, 
  depth = 0, 
  onRefresh,
  onOwnerUpdated,
  parentRefNbr = "0",
  onViewRelated,
  isReverseRelation = false,
  reverseData = null,
  expandedNodes,
  setExpandedNodes
}) => {
  const { showTerminated, setShowTerminated, isEffectivelyTerminated, getEffectiveStatus } = useOwnershipStatus();
  const current = entity ? normalizeEntity(entity) : ({} as any);
  const nodeId = current.referenceNbr || current.referenceNumber || current.id || `depth-${depth}-${current.ownerName}`;

  // Safely check if the node exists in our lifted state; if not, default to localIsExpanded (false/collapsed).
  const [localIsExpanded, setLocalIsExpanded] = useState(false);
  const isExpanded = expandedNodes && expandedNodes[nodeId] !== undefined 
    ? expandedNodes[nodeId] 
    : localIsExpanded;
  
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteContext, setDeleteContext] = useState<{ target: any, parentRefNbr: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [localChildren, setLocalChildren] = useState<any[]>([]);

  useEffect(() => {
    const parentRef = current.referenceNbr || current.referenceNumber || parentRefNbr;
    if (isReverseRelation && depth === 0) {
      setLocalChildren(prepareOwnershipChildren(Array.isArray(reverseData) ? reverseData : [], parentRef));
    } else {
      setLocalChildren(prepareOwnershipChildren(entity?.relatedContacts || [], parentRef));
    }
  }, [entity, reverseData, isReverseRelation, depth, current.referenceNbr, current.referenceNumber, parentRefNbr]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const visibleChildren = useMemo(
    () => filterContactsForDisplay(localChildren, showTerminated, isEffectivelyTerminated) as any[],
    [localChildren, showTerminated, isEffectivelyTerminated]
  );

  const hiddenTerminatedCount = useMemo(
    () => (depth === 0 ? countTerminatedInSubtree(entity, isEffectivelyTerminated) : 0),
    [depth, entity, isEffectivelyTerminated]
  );

  const childrenTotalPercentage = sumActiveChildPercentages(localChildren, isEffectivelyTerminated);

  const handleToggleExpand = () => {
    if (setExpandedNodes) {
      setExpandedNodes(prev => ({ ...prev, [nodeId]: !isExpanded }));
    } else {
      setLocalIsExpanded(!localIsExpanded);
    }
  };

  if (!entity) return null;
  
  if (isReverseRelation && reverseData === null && depth === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-xs font-semibold text-slate-600 uppercase tracking-wider">
        No reverse relationships found.
      </div>
    );
  }

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
          referenceNbr: deleteContext.target.referenceNumber || deleteContext.target.referenceNbr,
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
    const payload = buildAddOwnerPayload(formData);

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
        // We no longer force setExpandedNodes here so it respects the user's layout
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

  const entityHeadingLevel = depth === 0 ? 3 : depth === 1 ? 4 : 5;
  const EntityHeadingTag = (`h${entityHeadingLevel}` as 'h3' | 'h4' | 'h5');

  return (
    <div className="flex flex-col relative w-full">
      {isLoading && !deleteContext && (
        <div className="absolute inset-0 bg-white/60 z-[50] flex items-center justify-center rounded-md">
           <Loader2 className="animate-spin text-[#2c3e76]" size={32} />
        </div>
      )}

      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out" role="status" aria-live="polite">
          <div className="bg-green-700 text-white px-8 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center gap-4 border border-green-500">
            <div className="bg-white/20 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-bold tracking-wide">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-4 text-white/70 hover:text-white text-xl font-bold" aria-label="Dismiss notification">×</button>
          </div>
        </div>
      )}

      {localChildren.length > 0 && isExpanded && (
        <div className="absolute border-l-2 border-slate-200 z-10" style={{ left: '11px', top: '37px', bottom: '25px' }} />
      )}

      {depth === 0 && !isReverseRelation && (
        <div className="flex justify-end mb-2">
          <ShowTerminatedToggle
            showTerminated={showTerminated}
            onChange={setShowTerminated}
            hiddenCount={hiddenTerminatedCount}
          />
        </div>
      )}

      <div className="flex items-start gap-4 w-full">
        <div className="relative flex flex-col items-center flex-shrink-0 w-6">
          {localChildren.length > 0 ? (
            <button
              onClick={handleToggleExpand}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} owners for ${current.ownerName || 'entity'}`}
              className="mt-[13px] w-6 h-6 border border-slate-300 flex items-center justify-center bg-white z-20 shadow-sm cursor-pointer"
            >
              <ChevronDown size={14} className={`text-slate-600 transition-transform ${!isExpanded ? '-rotate-90' : ''}`} aria-hidden="true" />
            </button>
          ) : (
            <div className="mt-[19px] w-3 h-3 bg-[#24417a] z-20" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 bg-white border border-slate-200 shadow-sm overflow-hidden mb-6 z-20">
          <div className="flex items-center justify-between p-3 border-b bg-slate-50/30">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                {isIndividual ? "👤" : "🏢"}
              </span>
              <EntityHeadingTag className="font-bold text-[#1a2b4b] text-sm uppercase">
                {current.ownerName || entity?.ownerName || entity?.firstName}
              </EntityHeadingTag>
            </div>
            
            <div className="flex items-center gap-3">
              {!isReverseRelation && localChildren.length > 0 && (
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${
                  hasInvalidOwnershipTotal(childrenTotalPercentage)
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <Users size={12} />
                  <span>Total: {childrenTotalPercentage}%</span>
                </div>
              )}
              
              {!isReverseRelation && (
                <button
                  onClick={() => onViewRelated && onViewRelated(current)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors"
                  aria-label={`View related licenses for ${current.ownerName || 'entity'}`}
                >
                  <Layers size={18} aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedOwner({ 
                    ...current, 
                    parentRefNbr: parentRefNbr,
                    totalChildrenPercentage: childrenTotalPercentage
                })}
                className="p-1.5 text-gray-500 hover:text-[#24417a] transition-colors"
                aria-label={`View details for ${current.ownerName || 'entity'}`}
              >
                <Eye size={18} aria-hidden="true" />
              </button>
              
              {!isIndividual && !isReverseRelation && (
                <button 
                  onClick={() => setIsAdding(true)}
                  disabled={isLoading}
                  className="bg-[#24417a] text-white px-3 py-1 text-xs flex items-center gap-1 font-bold hover:bg-[#1a315e] transition-colors rounded-sm shadow-sm disabled:opacity-50"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
          </div>

          {isExpanded && visibleChildren.length > 0 && (
            <div className="divide-y divide-slate-50">
              {visibleChildren.map((child, idx) => {
                const name = child.ownerName || child.firstName || child.parentName || 'Unknown Entity';
                const type = child.contactType || child.relationType || 'OWNER';
                const percentage = child.percentage || child.ownershipPercentage || '0';
                const isAsitRow = isOwnershipAsitRow(child);
                const childTerminated = isAsitRow && isEffectivelyTerminated(child);
                const childStatus = isAsitRow ? getEffectiveStatus(child) : '';

                return (
                  <div key={idx} className={`grid items-center py-3 px-4 hover:bg-slate-50 transition-colors ${
                    isReverseRelation ? 'grid-cols-[30px_1fr_120px_50px]' : 'grid-cols-[30px_1fr_120px_60px_80px]'
                  } ${childTerminated ? 'opacity-60 bg-slate-50/80' : ''}`}>
                    <span className="text-sm text-slate-500">{idx + 1}.</span>
                    <span className="text-sm font-semibold text-slate-700 truncate flex items-center gap-2">
                      {name}
                      {childTerminated && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
                          {childStatus}
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-slate-600 font-bold uppercase text-[10px]">{type}</span>
                    
                    {!isReverseRelation && (
                      <span className="text-sm font-bold text-slate-700 text-right">
                        {String(percentage).includes('%') ? percentage : `${percentage}%`}
                      </span>
                    )}

                    <div className="flex justify-end gap-3">
                      {!isReverseRelation && (
                        <button
                          onClick={() => onViewRelated && onViewRelated(normalizeEntity(child))}
                          className="text-gray-500 hover:text-blue-600 transition-colors focus:outline-none"
                          aria-label={`View related licenses for ${name}`}
                        >
                          <Layers size={18} aria-hidden="true" />
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          const normalizedChild = normalizeEntity(child);
                          setSelectedOwner({ 
                              ...normalizedChild,
                              parentRefNbr: current.referenceNbr,
                              isChildOfCurrent: true
                          });
                        }}
                        className="text-gray-500 hover:text-[#24417a] transition-colors focus:outline-none"
                        aria-label={`View details for ${name}`}
                      >
                        <Eye size={18} aria-hidden="true" />
                      </button>
                      
                      {!isReverseRelation && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(child, current.referenceNbr)}
                          className="text-slate-500 hover:text-red-600 transition-colors focus:outline-none"
                          aria-label={`Delete ${name}`}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isExpanded && visibleChildren.length > 0 && (
        <div className="ml-[11px] pl-8 relative">
          {visibleChildren.map((child: any, idx: number) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[32px] top-0 bottom-0 w-[32px]">
                <div className="absolute left-0 top-[25px] w-full h-[2px] bg-slate-200" />
              </div>
              <OwnershipList 
                  entity={child} 
                  depth={depth + 1} 
                  onRefresh={onRefresh}
                  onOwnerUpdated={onOwnerUpdated}
                  parentRefNbr={current.referenceNbr}
                  onViewRelated={onViewRelated}
                  isReverseRelation={isReverseRelation}
                  expandedNodes={expandedNodes}
                  setExpandedNodes={setExpandedNodes}
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
            key={getOwnerReferenceNbr(selectedOwner)}
            owner={selectedOwner}
            onClose={() => setSelectedOwner(null)}
            onRefresh={() => { void onRefresh?.(); }}
            onOwnerUpdated={(refNbr, updates) => {
              onOwnerUpdated?.(refNbr, updates);
              setSelectedOwner((prev: any) => (prev ? { ...prev, ...updates } : null));
            }}
            currentTotalPercentage={selectedOwner.isChildOfCurrent ? childrenTotalPercentage : selectedOwner.totalChildrenPercentage}
            isFromList={true}
        />
      )}

      {deleteContext && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-owner-title"
        >
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#24417a] px-5 py-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-white" aria-hidden="true" />
              <h3 id="delete-owner-title" className="text-white font-semibold text-sm tracking-wide">Confirm Deletion</h3>
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