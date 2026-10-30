const displayCache = new Map();

function showsPendingStage(pending) {
  return pending && (pending.status === 'queued' || pending.status === 'saving');
}

/** Confirmed server state plus any unsaved move. */
export function applyPending(deal, pending) {
  return showsPendingStage(pending) ? { ...deal, stage: pending.waiting ?? pending.toStage } : deal;
}

/** The last confirmed copy of a deal. */
export function selectDeal(state, id) {
  return state.deals.list[state.deals.indexById[id]];
}

/** The deal the user sees, cached so a row only re-renders when its own deal changes. */
export function selectDisplayDeal(state, id) {
  const deal = selectDeal(state, id);
  const pending = state.pending[id];
  const cached = displayCache.get(id);
  if (cached && cached.deal === deal && cached.pending === pending) return cached.result;

  const result = applyPending(deal, pending);
  displayCache.set(id, { deal, pending, result });
  return result;
}

export function selectFailedCount(state) {
  return Object.values(state.pending).filter(
    (entry) => entry.status === 'failed' || entry.status === 'conflict',
  ).length;
}
