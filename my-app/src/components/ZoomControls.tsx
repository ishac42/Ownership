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
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-xl border border-slate-200/60" role="toolbar" aria-label="Chart zoom controls">
        <button onClick={onZoomIn} className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors" aria-label="Zoom in">
          <ZoomIn size={18} aria-hidden="true" />
        </button>
        <button onClick={onZoomOut} className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors" aria-label="Zoom out">
          <ZoomOut size={18} aria-hidden="true" />
        </button>
        <button onClick={onReset} className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors border-t border-slate-100 mt-1 pt-3" aria-label="Reset view">
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-purple-600 transition-colors border-t border-slate-100 mt-1 pt-3" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
           {isFullscreen ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
        </button>
      </div>
      <div className="absolute bottom-4 left-4 z-50 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-mono font-medium text-slate-600 border border-slate-200 shadow-sm pointer-events-none select-none" aria-live="polite">
        Zoom: {Math.round(currentZoom * 100)}%
      </div>
    </>
  );
};

export default ZoomControls;