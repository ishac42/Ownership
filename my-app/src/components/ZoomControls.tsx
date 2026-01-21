import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize } from 'lucide-react';

interface ZoomControlsProps {
  currentZoom: number; // Just for display
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  currentZoom, 
  onZoomIn, 
  onZoomOut, 
  onReset,
  isFullscreen, 
  toggleFullscreen 
}) => {
  return (
    <>
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-xl border border-slate-200/60">
        <button onClick={onZoomIn} className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors" title="Zoom In">
          <ZoomIn size={18} />
        </button>
        <button onClick={onZoomOut} className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors" title="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <button onClick={onReset} className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors border-t border-slate-100 mt-1 pt-3" title="Reset View">
          <RotateCcw size={16} />
        </button>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-purple-600 transition-colors border-t border-slate-100 mt-1 pt-3" title="Fullscreen">
           {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
      <div className="absolute bottom-4 left-4 z-50 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-mono font-medium text-slate-500 border border-slate-200 shadow-sm pointer-events-none select-none">
        Zoom: {Math.round(currentZoom * 100)}%
      </div>
    </>
  );
};

export default ZoomControls;