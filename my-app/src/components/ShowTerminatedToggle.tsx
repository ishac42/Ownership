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
}: ShowTerminatedToggleProps) => {
  const inputId = 'show-terminated-toggle';

  return (
    <div
      className={`inline-flex items-center gap-2 text-xs font-bold text-slate-600 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={showTerminated}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#24417a] cursor-pointer"
      />
      <label htmlFor={inputId} className="inline-flex items-center gap-2 cursor-pointer">
        {showTerminated ? <Eye size={14} className="text-slate-500" aria-hidden="true" /> : <EyeOff size={14} className="text-slate-500" aria-hidden="true" />}
        <span>Show terminated</span>
        {!showTerminated && hiddenCount > 0 && (
          <span className="text-slate-500 font-semibold">({hiddenCount})</span>
        )}
      </label>
    </div>
  );
};

export default ShowTerminatedToggle;
