import React, { useState, useEffect, useRef } from 'react';
import { Eye, Plus, ChevronDown, User, Building2, Trash2, AlertTriangle, Loader2 } from 'lucide-react'; 
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { normalizeEntity } from '../utils/normalize';
import { API_BASE_URL } from '../config';

// --- Imports ---
import AddOwnerForm from "./AddOwnerForm"; 
import OwnerDetailsCard from "./OwnerDetailsCard"; 
import ZoomControls from "./ZoomControls";

// 1. Recursive Tree Component
interface RecursiveTreeProps {
  entity: any;
  onViewDetails: (entity: any, parentRefNbr?: string, siblingTotal?: number, childrenSum?: number) => void;
  onOpenAdd: (parentEntity: any, childrenTotal?: number) => void;
  onDelete?: (entity: any, parentRefNbr: string) => void; 
  parentRefNbr?: string;
  siblingTotalPercentage?: number; 
}

export const RecursiveTree: React.FC<RecursiveTreeProps> = ({ 
  entity, 
  onViewDetails, 
  onOpenAdd,
  onDelete, 
  parentRefNbr = "",
  siblingTotalPercentage
}) => {
  const [localChildren, setLocalChildren] = useState<any[]>(entity?.relatedContacts || []);
  const current = normalizeEntity(entity);
  const isIndividual = (current.ownershipType || "").toLowerCase().includes('individual');
  const nodeBgColor = isIndividual ? 'bg-[#267471] border-[#1e5c5a]' : 'bg-[#792454] border-[#611d43]';

  useEffect(() => { setLocalChildren(entity?.relatedContacts || []); }, [entity]);

  const percentageValue = parseFloat(current.percentage || '0');
  const hasPercentage = percentageValue > 0;
  const isChild = parentRefNbr !== "";

  // --- CALCULATE TOTAL % OF THIS NODE'S CHILDREN ---
  const childrenTotalPercentage = localChildren.reduce((sum, child) => {
    const pct = parseFloat(String(child.percentage || '0').replace('%', '')) || 0;
    return sum + pct;
  }, 0);

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className={`relative z-10 w-68 p-4 rounded-lg shadow-xl text-white transition-transform duration-200 ${nodeBgColor} border-b-4 hover:-translate-y-1`}>
        
        {/* Over-allocation Warning Icon */}
        {childrenTotalPercentage > 100 && (
          <div 
            className="absolute -top-3 -right-3 bg-red-600 text-white p-1.5 rounded-full shadow-md animate-pulse border-2 border-white"
            title={`Warning: Children exceed 100% total (${childrenTotalPercentage}%). Please adjust ownership.`}
          >
            <AlertTriangle size={14} strokeWidth={3} />
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col overflow-hidden mr-2">
            <h4 className="text-xs font-bold uppercase truncate" title={current.ownerName}>{current.ownerName}</h4>
          </div>
          
          {hasPercentage && (
            <div className="bg-black/20 rounded px-2 py-0.5 min-w-[3rem] flex justify-center">
                <span className="text-xs font-bold">{current.percentage}%</span>
            </div>
          )}
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
                // Passing childrenTotalPercentage so the Detail Card can show the sum for this parent
                onViewDetails(current, parentRefNbr, siblingTotalPercentage, childrenTotalPercentage); 
              }}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors group"
            >
              <Eye size={14} className="opacity-80 group-hover:opacity-100" />
            </button>

            {isChild && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (onDelete) onDelete(current, parentRefNbr); 
                }}
                className="p-1.5 hover:bg-red-500/40 rounded-full transition-colors group"
                title="Remove Owner"
              >
                <Trash2 size={14} className="text-red-200 group-hover:text-white" />
              </button>
            )}
            
            {!isIndividual && (
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onOpenAdd(current, childrenTotalPercentage); 
                }}
                className="flex items-center gap-1 px-2 py-1 rounded transition-colors border bg-white/10 hover:bg-white/25 border-white/10"
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

      {localChildren.length > 0 && (
        <>
          <div className="w-px h-8 bg-slate-300" />
          <div className="flex justify-center items-start pt-4 relative">
            {localChildren.map((child, idx) => (
              <div key={idx} className="flex flex-col items-center px-4 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-slate-300" />
                {idx !== 0 && <div className="absolute -top-4 left-0 w-1/2 h-px bg-slate-300" />}
                {idx !== localChildren.length - 1 && <div className="absolute -top-4 right-0 w-1/2 h-px bg-slate-300" />}
                
                <RecursiveTree 
                  entity={child} 
                  onViewDetails={onViewDetails} 
                  onOpenAdd={onOpenAdd} 
                  onDelete={onDelete} 
                  parentRefNbr={current.referenceNbr}
                  siblingTotalPercentage={childrenTotalPercentage} 
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
const OwnershipChart: React.FC<OwnershipChartProps> = ({ entity, onRefresh }) => {
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

  // --- HANDLER: Handle Node Selection (View/Edit) ---
  const handleNodeSelect = (nodeData: any, parentRefNbr?: string, siblingTotal?: number, childrenSum?: number) => {
    if (!nodeData) return;
    const normalized = normalizeEntity(nodeData);
    setSelectedOwner({ 
        ...normalized, 
        parentRefNbr: parentRefNbr || "",
        isChildOfCurrent: !!parentRefNbr,
        totalChildrenPercentage: childrenSum // <-- PASSING TOTAL CHILDREN SUM HERE
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

      {addingToParent && (
        <AddOwnerForm 
          onCancel={() => setAddingToParent(null)} 
          onSave={handleSaveOwner} 
          currentTotalPercentage={totalForAdd} 
        />
      )}

      {selectedOwner && (
        <OwnerDetailsCard 
          owner={selectedOwner} 
          onClose={() => setSelectedOwner(null)} 
          onRefresh={handleEditRefresh}
          currentTotalPercentage={selectedOwner.isChildOfCurrent ? totalForEdit : selectedOwner.totalChildrenPercentage} 
          isFromList = {false}
        />
      )}

      {deleteContext && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#24417a] px-5 py-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-white" />
              <h3 className="text-white font-semibold text-sm tracking-wide">Confirm Deletion</h3>
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
                           entity={entity} 
                           onViewDetails={handleNodeSelect} 
                           onOpenAdd={handleOpenAdd}
                           onDelete={handleDeleteClick} 
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