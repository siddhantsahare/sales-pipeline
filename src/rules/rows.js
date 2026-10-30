import { applyPending } from '../store/selectors.js';
import { REASONS, getReasons, isOld } from './priority.js';

/** Whether a displayed deal belongs in the current view and filters. */
export function matchesFilters(deal, ui, pending, today) {
  const { search, owner, stage, oldOnly, failedOnly } = ui.filters;
  // Failed moves must always be findable, even if the deal no longer belongs in today's list.
  if (ui.view === 'today' && !failedOnly) {
    if (deal.owner !== ui.currentUser || getReasons(deal, today).length === 0) return false;
  }
  if (search && !deal.company.toLowerCase().includes(search.toLowerCase())) return false;
  if (owner && deal.owner !== owner) return false;
  if (stage && deal.stage !== stage) return false;
  if (oldOnly && !isOld(deal, today)) return false;
  if (failedOnly && pending?.status !== 'failed' && pending?.status !== 'conflict') return false;
  return true;
}

// Ranks are worked out once per deal: inside the comparator they'd run millions of times.
function urgencyComparator(rows, today) {
  const rank = new Map(rows.map((deal) => [deal.id, REASONS.indexOf(getReasons(deal, today)[0])]));
  return (a, b) => rank.get(a.id) - rank.get(b.id) || b.value - a.value;
}

function compareByColumn(a, b, { key, dir }) {
  const direction = dir === 'asc' ? 1 : -1;
  if (a[key] < b[key]) return -direction;
  if (a[key] > b[key]) return direction;
  return 0;
}

/** The ordered deal IDs for the table. Only runs when the user asks for a new order. */
export function buildRowIds(dealsById, ui, pendingById, today) {
  const rows = [];
  for (const id in dealsById) {
    const deal = applyPending(dealsById[id], pendingById[id]);
    if (matchesFilters(deal, ui, pendingById[id], today)) rows.push(deal);
  }
  const compare = ui.view === 'today'
    ? urgencyComparator(rows, today)
    : (a, b) => compareByColumn(a, b, ui.sort);
  return rows.sort(compare).map((deal) => deal.id);
}

/** Keeps focus on the same deal, or the nearest row if it has gone. */
export function refocus(oldIds, newIds, focusedId) {
  if (newIds.length === 0) return null;
  if (newIds.includes(focusedId)) return focusedId;
  const oldIndex = Math.max(oldIds.indexOf(focusedId), 0);
  return newIds[Math.min(oldIndex, newIds.length - 1)];
}
