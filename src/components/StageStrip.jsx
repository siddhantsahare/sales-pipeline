import { useDispatch, useSelector } from 'react-redux';
import { STAGES, STAGE_LABELS } from '../constants.js';
import { filtersChanged, listChanged } from '../store/uiSlice.js';

const formatLakhs = (value) => `₹${(value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}L`;

export default function StageStrip() {
  const dispatch = useDispatch();
  const totals = useSelector((state) => state.deals.stageTotals);
  const activeStage = useSelector((state) => state.ui.filters.stage);

  function toggle(stage) {
    dispatch(filtersChanged({ stage: stage === activeStage ? '' : stage }));
    dispatch(listChanged());
  }

  return (
    <nav className="grid flex-none grid-cols-7 gap-2" aria-label="Stages">
      {STAGES.map((stage) => (
        <button
          key={stage}
          aria-pressed={stage === activeStage}
          onClick={() => toggle(stage)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-xs hover:border-slate-300 aria-pressed:border-indigo-500 aria-pressed:bg-indigo-50"
        >
          <span className="block truncate text-xs font-medium text-slate-500">{STAGE_LABELS[stage]}</span>
          <span className="block text-base font-semibold text-slate-900 tabular-nums">
            {totals[stage].count.toLocaleString('en-IN')}
          </span>
          <span className="block truncate text-xs text-slate-500 tabular-nums">{formatLakhs(totals[stage].value)}</span>
        </button>
      ))}
    </nav>
  );
}
