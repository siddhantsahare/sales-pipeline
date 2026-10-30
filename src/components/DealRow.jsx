import { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { STAGES, STAGE_LABELS } from '../constants.js';
import { REASONS, getReasons } from '../rules/priority.js';
import { matchesFilters } from '../rules/rows.js';
import { selectDisplayDeal } from '../store/selectors.js';
import { focusChanged, selectionToggled } from '../store/uiSlice.js';
import { useEngine } from '../sync/EngineContext.js';
import ConflictChoice from './ConflictChoice.jsx';

const TODAY = new Date();

const REASON_STYLES = {
  [REASONS[0]]: 'bg-amber-100 text-amber-800',
  [REASONS[1]]: 'bg-sky-100 text-sky-800',
  [REASONS[2]]: 'bg-slate-100 text-slate-600',
};

const STAGE_STYLES = {
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-rose-100 text-rose-800',
};

const formatDate = (isoDate) => new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function SaveStatus({ dealId, pending }) {
  const { engine } = useEngine();
  if (!pending) return null;
  if (pending.status === 'conflict') return <ConflictChoice dealId={dealId} pending={pending} />;
  if (pending.status === 'failed') {
    return (
      <span className="flex flex-wrap items-center gap-x-2 text-xs leading-tight font-medium text-rose-700">
        Couldn't move to {STAGE_LABELS[pending.toStage]}
        <button className="btn-small" onClick={() => engine.retry(dealId)}>Retry</button>
      </span>
    );
  }
  return <span className="text-xs text-slate-500">Saving…</span>;
}

/** Selects only its own deal, so one change re-renders one row. */
function DealRow({ dealId, index, start }) {
  const deal = useSelector((state) => selectDisplayDeal(state, dealId));
  const pending = useSelector((state) => state.pending[dealId]);
  const focused = useSelector((state) => state.ui.focusedId === dealId);
  const selected = useSelector((state) => Boolean(state.ui.selectedIds[dealId]));
  const stale = useSelector((state) => !matchesFilters(deal, state.ui, pending, TODAY));
  const dispatch = useDispatch();
  const { engine } = useEngine();

  function changeStage(event) {
    engine.move(dealId, event.target.value);
    event.target.blur(); // Hands the keyboard back to the table's shortcuts.
  }

  const hasProblem = pending?.status === 'failed' || pending?.status === 'conflict';
  const classes = ['deal-grid absolute top-0 left-0 h-11 w-full border-b border-slate-100 hover:bg-slate-50'];
  if (selected) classes.push('bg-indigo-50');
  if (hasProblem) classes.push('bg-rose-50');
  if (focused) classes.push('bg-indigo-50 shadow-[inset_3px_0_0_var(--color-indigo-500)]');
  if (stale && !hasProblem) classes.push('opacity-40'); // A row needing a decision must stay readable.

  const reason = getReasons(deal, TODAY)[0];

  return (
    <div
      id={`row-${dealId}`}
      role="row"
      aria-rowindex={index + 2}
      aria-selected={selected}
      className={classes.join(' ')}
      style={{ transform: `translateY(${start}px)` }}
      onClick={() => dispatch(focusChanged(dealId))}
    >
      <span role="gridcell">
        <input
          type="checkbox"
          className="check block"
          aria-label={`Select ${deal.company}`}
          checked={selected}
          onChange={() => dispatch(selectionToggled(dealId))}
        />
      </span>
      <span role="gridcell" className="truncate">
        {reason && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REASON_STYLES[reason]}`}>{reason}</span>}
      </span>
      <span role="gridcell" className="truncate font-medium text-slate-900">{deal.company}</span>
      <span role="gridcell" className="text-right tabular-nums">₹{deal.value.toLocaleString('en-IN')}</span>
      <span role="gridcell">
        <select
          className={`w-full rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STAGE_STYLES[deal.stage] ?? 'bg-slate-100 text-slate-700'}`}
          aria-label={`Stage of ${deal.company}`}
          value={deal.stage}
          onChange={changeStage}
        >
          {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
        </select>
      </span>
      <span role="gridcell" className="truncate text-slate-600">{deal.owner}</span>
      <span role="gridcell" className="text-slate-600">{formatDate(deal.nextFollowUp)}</span>
      <span role="gridcell" className="text-slate-600">{formatDate(deal.lastActivity)}</span>
      <span role="gridcell"><SaveStatus dealId={dealId} pending={pending} /></span>
    </div>
  );
}

export default memo(DealRow);
