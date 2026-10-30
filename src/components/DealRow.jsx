import { memo } from 'react';
import { useSelector } from 'react-redux';
import { STAGE_LABELS } from '../constants.js';
import { getReasons } from '../rules/priority.js';
import { selectDisplayDeal } from '../store/selectors.js';

const TODAY = new Date();

function saveStatus(pending) {
  if (!pending) return '';
  if (pending.status === 'failed') return `Couldn't move to ${STAGE_LABELS[pending.toStage]}`;
  if (pending.status === 'conflict') return 'Conflict';
  return 'Saving…';
}

/** Selects only its own deal, so one change re-renders one row. */
function DealRow({ dealId, index, start }) {
  const deal = useSelector((state) => selectDisplayDeal(state, dealId));
  const pending = useSelector((state) => state.pending[dealId]);
  const focused = useSelector((state) => state.ui.focusedId === dealId);
  const selected = useSelector((state) => Boolean(state.ui.selectedIds[dealId]));

  const classes = ['row'];
  if (focused) classes.push('focused');
  if (selected) classes.push('selected');
  if (pending?.status === 'failed' || pending?.status === 'conflict') classes.push('problem');

  return (
    <div
      id={`row-${dealId}`}
      role="row"
      aria-rowindex={index + 2}
      aria-selected={selected}
      className={classes.join(' ')}
      style={{ transform: `translateY(${start}px)` }}
    >
      <span role="gridcell" className="reason">{getReasons(deal, TODAY)[0] ?? ''}</span>
      <span role="gridcell">{deal.company}</span>
      <span role="gridcell" className="number">₹{deal.value.toLocaleString('en-IN')}</span>
      <span role="gridcell">{STAGE_LABELS[deal.stage]}</span>
      <span role="gridcell">{deal.owner}</span>
      <span role="gridcell">{deal.nextFollowUp}</span>
      <span role="gridcell">{deal.lastActivity}</span>
      <span role="gridcell" className="status">{saveStatus(pending)}</span>
    </div>
  );
}

export default memo(DealRow);
