import { useState, useEffect, useRef, type FC } from 'react';
import { Eye, Plus, ChevronDown, User, Building2 } from 'lucide-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { normalizeEntity } from '../utils/normalize';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Imports ---
import AddOwnerForm from "./AddOwnerForm"; 
import OwnerDetailsCard from "./OwnerDetailsCard"; 
import ZoomControls from "./ZoomControls";

// 1. Recursive Tree Component
interface RecursiveTreeProps {
  entity: any;
  onViewDetails: (entity: any, parentRefNbr?: string) => void;
  onOpenAdd: (parentEntity: any) => void;
  parentRefNbr?: string;
}

export const RecursiveTree: FC<RecursiveTreeProps> = ({ 
  entity, 
  onViewDetails, 
  onOpenAdd,
  parentRefNbr = "" 
}) => {
  const [localChildren, setLocalChildren] = useState<any[]>(entity?.relatedContacts || []);
  const current = normalizeEntity(entity);
  const isIndividual = (current.ownershipType || "").toLowerCase().includes('individual');
  const nodeBgColor = isIndividual ? 'bg-[#267471] border-[#1e5c5a]' : 'bg-[#792454] border-[#611d43]';

  useEffect(() => { setLocalChildren(entity?.relatedContacts || []); }, [entity]);

  // Helper to safely check percentage
  const percentageValue = typeof current.percentage === 'number' ? current.percentage : parseFloat(String(current.percentage || 0));
  const hasPercentage = percentageValue > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className={`relative z-10 w-68 p-4 rounded-lg shadow-xl text-white transition-transform duration-200 ${nodeBgColor} border-b-4 hover:-translate-y-1`}>
        
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col overflow-hidden mr-2">
            <h4 className="text-xs font-bold uppercase truncate" title={current.ownerName}>{current.ownerName}</h4>
          </div>
          
          {/* CONDITION: Only show if percentage > 0 */}
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
                
                <RecursiveTree 
                  entity={child} 
                  onViewDetails={onViewDetails} 
                  onOpenAdd={onOpenAdd} 
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

// 2. Ownership Chart Component
interface OwnershipChartProps {
  entity: any;
  onRefresh?: () => Promise<void> | void; 
}

const OwnershipChart: FC<OwnershipChartProps> = ({ entity, onRefresh }) => {
  const [currentZoomScale, setCurrentZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [addingToParent, setAddingToParent] = useState<any | null>(null);
  
  // Loading State
  const [, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000); 
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fullscreen Logic
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { 
      containerRef.current?.requestFullscreen().catch(err => console.error(err)); 
      setIsFullscreen(true); 
    } else { 
      document.exitFullscreen(); 
      setIsFullscreen(false); 
    }
  };

  // --- HANDLER: Handle Node Selection ---
  const handleNodeSelect = (nodeData: any, parentRefNbr?: string) => {
    if (!nodeData) return;
    const normalized = normalizeEntity(nodeData);
    setSelectedOwner({ 
        ...normalized, 
        parentRefNbr: parentRefNbr || "" 
    });
  };

  // --- HANDLER: Add Owner ---
  const handleSaveOwner = async (formData: any) => {
    setIsLoading(true);
    const parent = normalizeEntity(addingToParent);
    
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
            parentRefNbr: parent.referenceNbr || "" 
        }),
      });

      if (response.ok) {
        setAddingToParent(null);
        setSuccessMessage(`Owner: ${formData.ownerName} added successfully`);
        if (onRefresh) await onRefresh();
      } else {
        alert("Failed to add owner.");
      }
    } catch (err) {
      alert("Connection Error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRefresh = async () => {
    if (onRefresh) {
        setIsLoading(true);
        try {
            await onRefresh();
        } finally {
            setIsLoading(false);
        }
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
      
      {/* --- PROFESSIONAL LOADING STATE (UPDATED - NO BLUR) --- 
      {loading && (
        // Removed backdrop-blur-sm here
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-slate-50/50 transition-all duration-300">
           <div className="flex items-center gap-3 px-6 py-3 bg-white/90 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100">
             <Loader2 className="animate-spin text-[#2c3e76]" size={20} />
             <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">Updating...</span>
             </div>
           </div>
        </div>
      )}*/}

      {/* --- SUCCESS TOAST --- */}
      {successMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[11000] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-emerald-500/50">
            <div className="bg-white/20 rounded-full p-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {addingToParent && (
        <AddOwnerForm 
          onCancel={() => setAddingToParent(null)} 
          onSave={handleSaveOwner} 
        />
      )}

      {selectedOwner && (
        <OwnerDetailsCard 
          owner={selectedOwner} 
          onClose={() => setSelectedOwner(null)} 
          onRefresh={handleEditRefresh} 
        />
      )}

      {/* --- INFINITE CANVAS AREA --- */}
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
                           onOpenAdd={setAddingToParent}
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