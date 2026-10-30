const displayCache = new Map();

function showsPendingStage(pending) {
  return pending && (pending.status === 'queued' || pending.status === 'saving');
}

/**
 * The deal the user sees: confirmed server state plus any unsaved move.
 * Cached per deal so a row only re-renders when its own deal changes.
 */
export function selectDisplayDeal(state, id) {
  const deal = state.deals.byId[id];
  const pending = state.pending[id];
  const cached = displayCache.get(id);
  if (cached && cached.deal === deal && cached.pending === pending) return cached.result;

  const result = showsPendingStage(pending)
    ? { ...deal, stage: pending.waiting ?? pending.toStage }
    : deal;
  displayCache.set(id, { deal, pending, result });
  return result;
}

export function selectFailedCount(state) {
  return Object.values(state.pending).filter(
    (entry) => entry.status === 'failed' || entry.status === 'conflict',
  ).length;
}
