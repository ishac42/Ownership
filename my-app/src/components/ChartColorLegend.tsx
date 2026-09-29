import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CHART_LEGEND_ITEMS, type ChartLegendItem } from '../utils/chartNodeColors';

const GROUP_ORDER = ['Owners', 'Records'] as const;

const ChartColorLegend = () => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const groups = GROUP_ORDER.map((name) => ({
    name,
    items: CHART_LEGEND_ITEMS.filter((item) => item.group === name),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="chart-legend absolute bottom-4 right-4 z-50"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Chart color legend"
          className="absolute bottom-full right-0 mb-2 w-52 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
        >
          <div className="space-y-2.5">
            {groups.map((group) => (
              <div key={group.name}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.name}
                </p>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <LegendRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-xl transition-colors ${
          open
            ? 'border-[#24417a] bg-[#24417a] text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Legend
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
};

function LegendRow({ item }: { item: ChartLegendItem }) {
  return (
    <li className="flex items-center gap-2 text-xs font-medium text-slate-700">
      <span
        className={`inline-block h-3.5 w-6 shrink-0 rounded-[3px] shadow-sm ${item.swatchClass}`}
        aria-hidden="true"
      />
      {item.label}
    </li>
  );
}

export default ChartColorLegend;
