import { applyPending } from '../store/selectors.js';
import { REASONS, getReasons, isOld } from './priority.js';

/** Whether a displayed deal belongs in the current view and filters. */
export function matchesFilters(deal, ui, pending, today) {
  const { search, owner, stage, oldOnly, failedOnly } = ui.filters;
  if (ui.view === 'today') {
    if (deal.owner !== ui.currentUser || getReasons(deal, today).length === 0) return false;
  }
  if (search && !deal.company.toLowerCase().includes(search.toLowerCase())) return false;
  if (owner && deal.owner !== owner) return false;
  if (stage && deal.stage !== stage) return false;
  if (oldOnly && !isOld(deal, today)) return false;
  if (failedOnly && pending?.status !== 'failed' && pending?.status !== 'conflict') return false;
  return true;
}

function compareByUrgency(a, b, today) {
  const rank = (deal) => REASONS.indexOf(getReasons(deal, today)[0]);
  return rank(a) - rank(b) || b.value - a.value;
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
    ? (a, b) => compareByUrgency(a, b, today)
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
