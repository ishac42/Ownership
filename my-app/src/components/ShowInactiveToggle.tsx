import { Eye, EyeOff } from 'lucide-react';

interface ShowInactiveToggleProps {
  showInactive: boolean;
  onChange: (value: boolean) => void;
  hiddenCount?: number;
  className?: string;
}

const ShowInactiveToggle = ({
  showInactive,
  onChange,
  hiddenCount = 0,
  className = '',
}: ShowInactiveToggleProps) => (
  <label
    className={`inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 select-none ${className}`}
  >
    <input
      type="checkbox"
      checked={showInactive}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 accent-[#24417a] cursor-pointer"
    />
    {showInactive ? <Eye size={14} className="text-slate-500" /> : <EyeOff size={14} className="text-slate-400" />}
    <span>Show inactive</span>
    {!showInactive && hiddenCount > 0 && (
      <span className="text-slate-400 font-semibold">({hiddenCount})</span>
    )}
  </label>
);

export default ShowInactiveToggle;
