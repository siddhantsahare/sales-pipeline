import { useDispatch, useSelector } from 'react-redux';
import { STAGES, STAGE_LABELS } from '../constants.js';
import { filtersChanged, rowsRefreshed } from '../store/uiSlice.js';

const formatLakhs = (value) => `₹${(value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}L`;

export default function StageStrip() {
  const dispatch = useDispatch();
  const totals = useSelector((state) => state.deals.stageTotals);
  const activeStage = useSelector((state) => state.ui.filters.stage);

  function toggle(stage) {
    dispatch(filtersChanged({ stage: stage === activeStage ? '' : stage }));
    dispatch(rowsRefreshed());
  }

  return (
    <nav className="stage-strip" aria-label="Stages">
      {STAGES.map((stage) => (
        <button key={stage} aria-pressed={stage === activeStage} onClick={() => toggle(stage)}>
          <strong>{STAGE_LABELS[stage]}</strong>
          <span>{totals[stage].count.toLocaleString('en-IN')} · {formatLakhs(totals[stage].value)}</span>
        </button>
      ))}
    </nav>
  );
}
