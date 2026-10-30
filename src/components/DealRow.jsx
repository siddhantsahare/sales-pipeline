import { memo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { STAGE_LABELS } from '../constants.js';
import { getReasons } from '../rules/priority.js';
import { matchesFilters } from '../rules/rows.js';
import { selectDisplayDeal } from '../store/selectors.js';
import { focusChanged } from '../store/uiSlice.js';
import ConflictChoice from './ConflictChoice.jsx';

const TODAY = new Date();

function SaveStatus({ dealId, pending }) {
  if (!pending) return null;
  if (pending.status === 'conflict') return <ConflictChoice dealId={dealId} pending={pending} />;
  if (pending.status === 'failed') return `Couldn't move to ${STAGE_LABELS[pending.toStage]} · r to retry`;
  return 'Saving…';
}

/** Selects only its own deal, so one change re-renders one row. */
function DealRow({ dealId, index, start }) {
  const deal = useSelector((state) => selectDisplayDeal(state, dealId));
  const pending = useSelector((state) => state.pending[dealId]);
  const focused = useSelector((state) => state.ui.focusedId === dealId);
  const selected = useSelector((state) => Boolean(state.ui.selectedIds[dealId]));
  const stale = useSelector((state) => !matchesFilters(deal, state.ui, pending, TODAY));
  const firstVersion = useRef(deal.version);
  const dispatch = useDispatch();

  const classes = ['row'];
  if (focused) classes.push('focused');
  if (selected) classes.push('selected');
  if (stale) classes.push('stale');
  if (pending?.status === 'failed' || pending?.status === 'conflict') classes.push('problem');

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
      {deal.version !== firstVersion.current && <i key={deal.version} className="flash" />}
      <span role="gridcell" className="reason">{getReasons(deal, TODAY)[0] ?? ''}</span>
      <span role="gridcell">{deal.company}</span>
      <span role="gridcell" className="number">₹{deal.value.toLocaleString('en-IN')}</span>
      <span role="gridcell">{STAGE_LABELS[deal.stage]}</span>
      <span role="gridcell">{deal.owner}</span>
      <span role="gridcell">{deal.nextFollowUp}</span>
      <span role="gridcell">{deal.lastActivity}</span>
      <span role="gridcell" className="status"><SaveStatus dealId={dealId} pending={pending} /></span>
    </div>
  );
}

export default memo(DealRow);
