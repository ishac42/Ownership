import { CHART_LEGEND_ITEMS } from '../utils/chartNodeColors';

const ChartColorLegend = () => {
  return (
    <aside
      className="absolute bottom-4 left-4 right-32 z-50 rounded-lg border border-slate-200/60 bg-white/95 px-3 py-2 shadow-xl pointer-events-none"
      aria-label="Chart color legend"
    >
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {CHART_LEGEND_ITEMS.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <span className={`inline-block h-3 w-3 shrink-0 rounded-sm ${item.swatchClass}`} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default ChartColorLegend;
