import { Eye, EyeOff } from 'lucide-react';

interface ShowTerminatedToggleProps {
  showTerminated: boolean;
  onChange: (value: boolean) => void;
  hiddenCount?: number;
  className?: string;
}

const ShowTerminatedToggle = ({
  showTerminated,
  onChange,
  hiddenCount = 0,
  className = '',
}: ShowTerminatedToggleProps) => (
  <label
    className={`inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 select-none pointer-events-auto ${className}`}
    onClick={(e) => e.stopPropagation()}
  >
    <input
      type="checkbox"
      checked={showTerminated}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 accent-[#24417a] cursor-pointer"
    />
    {showTerminated ? <Eye size={14} className="text-slate-500" /> : <EyeOff size={14} className="text-slate-400" />}
    <span>Show terminated</span>
    {!showTerminated && hiddenCount > 0 && (
      <span className="text-slate-400 font-semibold">({hiddenCount})</span>
    )}
  </label>
);

export default ShowTerminatedToggle;
