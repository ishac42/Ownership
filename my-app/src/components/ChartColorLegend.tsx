import { CHART_LEGEND_ITEMS, type ChartLegendItem } from '../utils/chartNodeColors';

const GROUP_ORDER = ['Owners', 'Records'] as const;

const ChartColorLegend = () => {
  const groups = GROUP_ORDER.map((name) => ({
    name,
    items: CHART_LEGEND_ITEMS.filter((item) => item.group === name),
  })).filter((group) => group.items.length > 0);

  return (
    <div
      className="chart-legend absolute bottom-4 right-4 z-50 w-52 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
      role="region"
      aria-label="Chart color legend"
      onPointerDown={(event) => event.stopPropagation()}
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
