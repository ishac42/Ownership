import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, Plus, ChevronDown, User, Building2, Trash2, AlertTriangle, Loader2, Layers, FileText } from 'lucide-react'; 
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { normalizeEntity } from '../utils/normalize';
import { API_BASE_URL } from '../config';
import { useOwnershipStatus } from '../context/OwnershipStatusContext';
import {
  filterContactsForDisplay,
  sumActiveChildPercentages,
  countTerminatedInSubtree,
  isOwnershipAsitRow,
  getOwnerReferenceNbr,
} from '../utils/ownershipStatus';
import { prepareOwnershipChildren } from '../utils/ownershipTree';
import {
  attachRootLicensesFromReverse,
  collectLicenseDetails,
  relatedLicenseFromItem,
  upsertRelatedLicense,
  type RelatedLicense,
} from '../utils/relatedLicenses';

// --- Imports ---
import AddOwnerForm from "./AddOwnerForm"; 
import OwnerDetailsCard from "./OwnerDetailsCard"; 
import ZoomControls from "./ZoomControls";
import { buildAddOwnerPayload } from '../utils/ownerPayload';
import { isOperatingEntityType } from '../utils/entityType';
import ShowTerminatedToggle from './ShowTerminatedToggle';

// 1. Recursive Tree Component
interface RecursiveTreeProps {
  entity: any;
  onViewDetails: (entity: any, parentRefNbr?: string, siblingTotal?: number, childrenSum?: number) => void;
  onViewRelated: (entity: any) => void;
  onViewOperatingEntity?: (entity: any) => void;
  onOpenAdd: (parentEntity: any, childrenTotal?: number) => void;
  onDelete?: (entity: any, parentRefNbr: string) => void; 
  parentRefNbr?: string;
  siblingTotalPercentage?: number; 
  isReverseRelation?: boolean; 
  reverseData?: any[] | null;
  viewOnly?: boolean;
  reverseLayer?: number;
}

export const RecursiveTree: React.FC<RecursiveTreeProps> = ({ 
  entity, 
  onViewDetails,
  onViewRelated,
  onViewOperatingEntity,
  onOpenAdd,
  onDelete, 
  parentRefNbr = "",
  siblingTotalPercentage,
  isReverseRelation = false,
  reverseData = null,
  viewOnly = false,
  reverseLayer = 0,
}) => {
  const { showTerminated, isEffectivelyTerminated } = useOwnershipStatus();
  const [localChildren, setLocalChildren] = useState<any[]>([]);
  const current = normalizeEntity(entity);
  
  const isLicenseNode = !!entity?.isLicenseNode;
  const isIndividual = (current.ownershipType || "").toLowerCase().includes('individual');
  const nodeTerminated = isOwnershipAsitRow(entity) && isEffectivelyTerminated(entity);
  const hasLicenses = collectLicenseDetails(entity, (current as any)?.licenseAltId).size > 0;
  const typeLabel = isLicenseNode ? 'License Record' : isIndividual ? 'Individual' : (current.contactType || 'Organization');
  const showOperatingEntityLink =
    isReverseRelation &&
    !isLicenseNode &&
    !isIndividual &&
    typeof onViewOperatingEntity === 'function' &&
    (isOperatingEntityType(typeLabel) || hasLicenses);

  // Original theme colors (licenses vs individuals vs organizations)
  let nodeBgColor = isIndividual ? 'bg-[#267471] border-[#1e5c5a]' : 'bg-[#792454] border-[#611d43]';
  if (isLicenseNode) {
    nodeBgColor = 'bg-[#1e40af] border-[#1e3a8a]';
  }

  useEffect(() => {
    let baseChildren: any[] = [];

    // 1. Populate initial structural children
    if (isReverseRelation && parentRefNbr === "") {
      baseChildren = Array.isArray(reverseData) ? [...reverseData] : [];
    } else {
      baseChildren = entity?.relatedContacts ? [...entity.relatedContacts] : [];
    }

    // 2. Extract unique licenses on this node (alt ID + reverse-lookup details)
    const licenseDetails = collectLicenseDetails(entity, (current as any)?.licenseAltId);

    // 3. Inject separate visual child nodes for each license found
    if (!isLicenseNode) {
      licenseDetails.forEach((rec, licenseId) => {
        const alreadyExists = baseChildren.some(child => child.isLicenseNode && child.ownerName === licenseId);
        if (!alreadyExists) {
          baseChildren.push({
            ownerName: licenseId,
            contactType: 'License Record',
            ownershipType: 'License',
            isLicenseNode: true,
            referenceNbr: `lic-${licenseId}`,
            licenseType: rec.licenseType,
            businessName: rec.businessName,
            locationAddress: rec.locationAddress,
            relatedContacts: []
          });
        }
      });
    }

    setLocalChildren(prepareOwnershipChildren(baseChildren, parentRefNbr || entity?.referenceNbr || entity?.referenceNumber));
  }, [entity, reverseData, isReverseRelation, parentRefNbr, current]);

  const visibleChildren = useMemo(
    () => filterContactsForDisplay(localChildren, showTerminated, isEffectivelyTerminated) as any[],
    [localChildren, showTerminated, isEffectivelyTerminated]
  );

  const percentageValue = parseFloat(String(current.percentage || '0').replace('%', '')) || 0;
  const hasPercentage = percentageValue > 0;
  const isChild = parentRefNbr !== "";
  const showPercentageChip =
    hasPercentage &&
    !isLicenseNode &&
    (!isReverseRelation || reverseLayer === 1);

  // --- CALCULATE TOTAL % (EXCLUDING LICENSES AND INACTIVE FROM NUMERIC MATH) ---
  const childrenTotalPercentage = sumActiveChildPercentages(localChildren, isEffectivelyTerminated);

  return (
    <div className="flex flex-col items-center">
      {/* Node Card — original visuals + accessible control names */}
      <div className={`relative z-10 w-68 p-4 rounded-lg shadow-xl text-white transition-transform duration-200 ${nodeBgColor} border-b-4 hover:-translate-y-1 ${nodeTerminated ? 'ring-2 ring-slate-300 ring-offset-2' : ''}`}>

        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col overflow-hidden mr-2">
            <p className="text-xs font-bold uppercase truncate" title={current.ownerName}>
              {isLicenseNode ? `ID: ${current.ownerName}` : current.ownerName}
            </p>
            {isLicenseNode && isReverseRelation && (
              <div className="mt-2 space-y-1 normal-case" aria-label="License record details">
                {current.licenseType ? (
                  <p className="text-[10px] leading-snug break-words" title={current.licenseType}>
                    <span className="font-semibold opacity-80">License Type: </span>
                    {current.licenseType}
                  </p>
                ) : null}
                {current.businessName ? (
                  <p className="text-[10px] leading-snug break-words" title={current.businessName}>
                    <span className="font-semibold opacity-80">Business Name: </span>
                    {current.businessName}
                  </p>
                ) : null}
                {current.locationAddress ? (
                  <p className="text-[10px] leading-snug break-words opacity-90" title={current.locationAddress}>
                    <span className="font-semibold opacity-80">Location Address: </span>
                    {current.locationAddress}
                  </p>
                ) : null}
              </div>
            )}
            {nodeTerminated && (
              <span className="text-[9px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded bg-black text-white w-fit">
                Terminated
              </span>
            )}
          </div>

          {showPercentageChip && (
            <div className="bg-black/20 rounded px-2 py-0.5 min-w-[3rem] flex justify-center">
              <span className="text-xs font-bold">{String(current.percentage).replace('%', '')}%</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 opacity-90">
            {isLicenseNode ? <FileText size={12} aria-hidden="true" /> : isIndividual ? <User size={12} aria-hidden="true" /> : <Building2 size={12} aria-hidden="true" />}
            {showOperatingEntityLink ? (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewOperatingEntity?.({ ...entity, ...current });
                }}
                className="oe-ownership-link text-[10px] font-semibold tracking-wide text-white/90 hover:text-white border-b border-white/40 hover:border-white pb-px transition-colors cursor-pointer"
                aria-label={`Open ownership chart for ${current.ownerName || 'this operating entity'}`}
                title="Open ownership chart in a new tab"
              >
                {isOperatingEntityType(typeLabel) ? typeLabel : 'Operating Entity'}
              </button>
            ) : (
              <span className="text-[10px] font-semibold tracking-wide">
                {isLicenseNode ? 'License Record' : isIndividual ? 'Individual' : current.contactType}
              </span>
            )}
          </div>

          {!isLicenseNode && (
            <div className="flex items-center gap-2" role="toolbar" aria-label={`Actions for ${current.ownerName || 'entity'}`}>
              {!viewOnly && !isReverseRelation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewRelated(current);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors group"
                  aria-label={`Open related licenses for ${current.ownerName || 'entity'}`}
                  title="Open in new tab"
                >
                  <Layers size={14} className="opacity-80 group-hover:opacity-100" aria-hidden="true" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(current, parentRefNbr, siblingTotalPercentage, childrenTotalPercentage);
                }}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors group"
                aria-label={`View details for ${current.ownerName || 'entity'}`}
                title="View Details"
              >
                <Eye size={14} className="opacity-80 group-hover:opacity-100" aria-hidden="true" />
              </button>

              {!viewOnly && isChild && !isReverseRelation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete(current, parentRefNbr);
                  }}
                  className="p-1.5 hover:bg-red-500/40 rounded-full transition-colors group"
                  aria-label={`Remove ${current.ownerName || 'owner'}`}
                  title="Remove Owner"
                >
                  <Trash2 size={14} className="text-red-200 group-hover:text-white" aria-hidden="true" />
                </button>
              )}

              {!viewOnly && !isIndividual && !isReverseRelation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAdd(current, childrenTotalPercentage);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded transition-colors border bg-white/10 hover:bg-white/25 border-white/10"
                  aria-label={`Add owner to ${current.ownerName || 'entity'}`}
                >
                  <Plus size={10} strokeWidth={3} aria-hidden="true" />
                  <span className="text-[9px] font-bold uppercase">Add</span>
                </button>
              )}
            </div>
          )}
        </div>

        {visibleChildren.length > 0 && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-400 rounded-full p-0.5 shadow-sm border border-slate-200" aria-hidden="true">
            <ChevronDown size={12} strokeWidth={3} />
          </div>
        )}
      </div>

      {visibleChildren.length > 0 && (
        <>
          <div className="w-px h-8 bg-slate-300" aria-hidden="true" />
          <div className="flex justify-center items-start pt-4 relative">
            {visibleChildren.map((child, idx) => (
              <div key={idx} className="flex flex-col items-center px-4 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-slate-300" aria-hidden="true" />
                {idx !== 0 && <div className="absolute -top-4 left-0 w-1/2 h-px bg-slate-300" aria-hidden="true" />}
                {idx !== visibleChildren.length - 1 && <div className="absolute -top-4 right-0 w-1/2 h-px bg-slate-300" aria-hidden="true" />}

                <RecursiveTree
                  entity={child}
                  onViewDetails={onViewDetails}
                  onViewRelated={onViewRelated}
                  onViewOperatingEntity={onViewOperatingEntity}
                  onOpenAdd={onOpenAdd}
                  onDelete={onDelete}
                  parentRefNbr={current.referenceNbr}
                  siblingTotalPercentage={childrenTotalPercentage}
                  isReverseRelation={isReverseRelation}
                  reverseData={null}
                  viewOnly={viewOnly}
                  reverseLayer={reverseLayer + 1}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// 2. Ownership Chart Component
interface OwnershipChartProps {
  entity: any; // Can now seamlessly accept an individual Object or a Base Array containing multiple parent nodes
  onRefresh?: () => Promise<void> | void;
  onOwnerUpdated?: (refNbr: string, updates: Record<string, unknown>) => void;
  onViewRelated?: (entity: any) => void;
  onViewOperatingEntity?: (entity: any) => void;
  isReverseRelation?: boolean; 
  reverseData?: any[] | null;
  viewOnly?: boolean;
}

const OwnershipChart: React.FC<OwnershipChartProps> = ({ 
  entity, 
  onRefresh,
  onOwnerUpdated,
  onViewRelated,
  onViewOperatingEntity,
  isReverseRelation = false,
  reverseData = null,
  viewOnly = false,
}) => {
  const { showTerminated, setShowTerminated, isEffectivelyTerminated } = useOwnershipStatus();
  const hiddenTerminatedCount = countTerminatedInSubtree(entity, isEffectivelyTerminated);

  const [currentZoomScale, setCurrentZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [totalForEdit, setTotalForEdit] = useState<number | undefined>(undefined); 
  
  const [addingToParent, setAddingToParent] = useState<any | null>(null);
  const [totalForAdd, setTotalForAdd] = useState<number>(0); 
  
  const [deleteContext, setDeleteContext] = useState<{ target: any, parentRefNbr: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000); 
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { 
      containerRef.current?.requestFullscreen().catch(err => console.error(err)); 
      setIsFullscreen(true); 
    } else { 
      document.exitFullscreen(); 
      setIsFullscreen(false); 
    }
  };

  const handleNodeSelect = (nodeData: any, parentRefNbr?: string, siblingTotal?: number, childrenSum?: number) => {
    if (!nodeData) return;
    const normalized = normalizeEntity(nodeData);
    setSelectedOwner({ 
        ...normalized, 
        parentRefNbr: parentRefNbr || "",
        isChildOfCurrent: !!parentRefNbr,
        totalChildrenPercentage: childrenSum 
    });
    setTotalForEdit(siblingTotal); 
  };

  const handleOpenAdd = (parentEntity: any, childrenTotal?: number) => {
    setAddingToParent(parentEntity);
    setTotalForAdd(childrenTotal || 0); 
  };

  const handleDeleteClick = (target: any, parentRefNbr: string) => {
    setDeleteContext({ target, parentRefNbr });
  };

  const confirmDelete = async () => {
    if (!deleteContext) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/delete-owner`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          referenceNbr: deleteContext.target.referenceNbr,
          parentRefNbr: deleteContext.parentRefNbr 
        }),
      });
      if (response.ok) {
        setSuccessMessage(`Deleted successfully`);
        if (onRefresh) await onRefresh();
      }
    } catch (error) {
      alert("Error connecting to server.");
    } finally {
      setLoading(false);
      setDeleteContext(null);
    }
  };

  const handleSaveOwner = async (formData: any) => {
    setLoading(true);
    const parent = normalizeEntity(addingToParent);
    const payload = buildAddOwnerPayload(formData);

    try {
      const response = await fetch(`${API_BASE_URL}/api/add-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            newAsitArr: JSON.stringify(payload), 
            fein: formData.fein, 
            ssn: formData.ssn, 
            parentRefNbr: parent.referenceNbr || "" 
        }),
      });
      if (response.ok) {
        setAddingToParent(null);
        setSuccessMessage(`Owner added successfully`);
        if (onRefresh) await onRefresh();
      }
    } catch (err) {
      alert("Connection Error.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRefresh = async () => {
    if (onRefresh) {
        setLoading(true);
        try { await onRefresh(); } finally { setLoading(false); }
    }
  };

  if (!entity) return null;

  // --- MERGE MULTIPLE ROOT ENTITIES OR SIBLING LICENSE RECORDS SAFELY ---
  const getNormalizedTreeRoot = () => {
    // Forward (normal) charts must never treat reverse `parents` as the tree root.
    const rawList = Array.isArray(entity)
      ? entity
      : (isReverseRelation && entity.parents)
        ? entity.parents
        : [entity];
    
    if (rawList.length === 0) return null;

    const uniqueRootMap = new Map<string, any>();

    rawList.forEach((item: any) => {
      if (!item) return;
      // Combine business name and account reference ID to create unique mapping keys
      const identityKey = `${item.ownerName || ''}_${item.referenceNbr || ''}`;
      const activeLicense = relatedLicenseFromItem(item);

      if (uniqueRootMap.has(identityKey)) {
        const existingNode = uniqueRootMap.get(identityKey);
        if (!Array.isArray(existingNode._licenses)) existingNode._licenses = [];
        upsertRelatedLicense(existingNode._licenses as RelatedLicense[], activeLicense);
        // Merge downstream related nested structures cleanly
        if (Array.isArray(item.relatedContacts)) {
          item.relatedContacts.forEach((child: any) => {
            const childExists = existingNode.relatedContacts.some((c: any) => c.referenceNbr === child.referenceNbr);
            if (!childExists) existingNode.relatedContacts.push(child);
          });
        }
      } else {
        const structuralClone = { 
          ...item,
          _licenses: activeLicense ? [activeLicense] : ([] as RelatedLicense[]),
          relatedContacts: Array.isArray(item.relatedContacts) ? [...item.relatedContacts] : []
        };
        uniqueRootMap.set(identityKey, structuralClone);
      }
    });

    const consolidatedRoots = Array.from(uniqueRootMap.values());

    // If there is only one true corporate group root, pass it along directly
    if (consolidatedRoots.length === 1) {
      return consolidatedRoots[0];
    }

    // Otherwise, create a neat virtual folder node to tie multiple corporate tracks into one visual chart
    return {
      ownerName: "Corporate Structure Groups",
      contactType: "Hierarchy Overview",
      ownershipType: "System View",
      referenceNbr: "root-virtual",
      relatedContacts: consolidatedRoots
    };
  };

  const operationalRootNode = getNormalizedTreeRoot();

  // --- REVERSE RELATION LINK PROCESSING ---
  let processedReverseData = reverseData;
  if (isReverseRelation && Array.isArray(reverseData)) {
    const rootRef = String(entity?.referenceNbr || entity?.referenceNumber || '');
    const { parentRows, rootLicenses } = attachRootLicensesFromReverse(reverseData, rootRef);
    const parentMap = new Map<string, any>();

    parentRows.forEach((item) => {
      const key = `${item.ownerName || ''}_${item.referenceNbr || ''}`;
      const existing = parentMap.get(key);
      const currentLic = relatedLicenseFromItem(item);

      if (existing) {
        if (!Array.isArray(existing._licenses)) existing._licenses = [];
        upsertRelatedLicense(existing._licenses as RelatedLicense[], currentLic);
        if (!existing.percentage && item.percentage) {
          existing.percentage = item.percentage;
        }
      } else {
        const newItem = { ...item };
        newItem._licenses = currentLic ? [currentLic] : [];
        parentMap.set(key, newItem);
      }
    });

    processedReverseData = Array.from(parentMap.values());

    if (operationalRootNode && rootLicenses.length > 0) {
      if (!Array.isArray(operationalRootNode._licenses)) operationalRootNode._licenses = [];
      rootLicenses.forEach((lic) => {
        upsertRelatedLicense(operationalRootNode._licenses as RelatedLicense[], lic);
      });
    }
  }

  if (!operationalRootNode) return null;

  return (
    <div 
      ref={containerRef} 
      className={`relative flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-lg select-none
        ${isFullscreen ? 'fixed inset-0 z-[9000] h-screen w-screen rounded-none' : 'w-full h-[600px]'}
      `}
    >
      {loading && !deleteContext && (
        <div className="absolute inset-0 bg-white/10 z-[9500] flex items-center justify-center rounded-xl">
           <Loader2 className="animate-spin text-[#2c3e76]" size={32} />
        </div>
      )}

      {successMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[11000] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-emerald-500/50">
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {!isReverseRelation && (
        <div className="absolute top-4 left-4 z-[60] bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200/60 pointer-events-auto">
          <ShowTerminatedToggle
            showTerminated={showTerminated}
            onChange={setShowTerminated}
            hiddenCount={hiddenTerminatedCount}
          />
        </div>
      )}

      {!viewOnly && addingToParent && (
        <AddOwnerForm 
          onCancel={() => setAddingToParent(null)} 
          onSave={handleSaveOwner} 
          currentTotalPercentage={totalForAdd} 
        />
      )}

      {selectedOwner && (
        <OwnerDetailsCard
          key={getOwnerReferenceNbr(selectedOwner)}
          owner={selectedOwner}
          onClose={() => setSelectedOwner(null)}
          onRefresh={viewOnly ? undefined : handleEditRefresh}
          onOwnerUpdated={viewOnly ? undefined : (refNbr, updates) => {
            onOwnerUpdated?.(refNbr, updates);
            setSelectedOwner((prev: any) => (prev ? { ...prev, ...updates } : null));
          }}
          currentTotalPercentage={selectedOwner.isChildOfCurrent ? totalForEdit : selectedOwner.totalChildrenPercentage}
          isFromList={false}
          readOnly={viewOnly}
        />
      )}

      {!viewOnly && deleteContext && (
        <div
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chart-delete-title"
        >
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#24417a] px-5 py-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-white" aria-hidden="true" />
              <h3 id="chart-delete-title" className="text-white font-semibold text-sm tracking-wide">Confirm Deletion</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-700">
                Remove <span className="font-bold text-[#1a2b4b]">{deleteContext.target.ownerName || deleteContext.target.firstName}</span>?
              </p>
            </div>
            <div className="bg-slate-50 px-5 py-4 flex justify-end gap-3 border-t">
              <button 
                onClick={() => setDeleteContext(null)} 
                disabled={loading}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={loading}
                className={`px-4 py-2 text-sm bg-red-600 text-white rounded flex items-center justify-center min-w-[80px] transition-all ${
                  loading ? 'opacity-80 cursor-wait' : 'hover:bg-red-700'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={3}
        centerOnInit={true}
        limitToBounds={false}
        panning={{ excluded: ['input', 'select', 'textarea', 'button', 'a', 'oe-ownership-link'] }}
        doubleClick={{ excluded: ['button', 'a', 'oe-ownership-link'] }}
        onTransformed={(e) => setCurrentZoomScale(e.state.scale)} 
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <ZoomControls 
                currentZoom={currentZoomScale} 
                onZoomIn={() => zoomIn()} 
                onZoomOut={() => zoomOut()} 
                onReset={() => resetTransform()}
                isFullscreen={isFullscreen} 
                toggleFullscreen={toggleFullscreen} 
            />
            <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
                    <div className="min-w-max min-h-max p-40">
                          <RecursiveTree 
                            entity={operationalRootNode} 
                            onViewDetails={handleNodeSelect} 
                            onViewRelated={(e) => onViewRelated && onViewRelated(e)}
                            onViewOperatingEntity={onViewOperatingEntity}
                            onOpenAdd={handleOpenAdd}
                            onDelete={handleDeleteClick} 
                            isReverseRelation={isReverseRelation}
                            reverseData={processedReverseData}
                            viewOnly={viewOnly}
                          />
                    </div>
                </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default OwnershipChart;