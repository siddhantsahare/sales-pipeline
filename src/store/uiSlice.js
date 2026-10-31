import { createSlice } from '@reduxjs/toolkit';
import { buildRowIds, matchesFilters, refocus } from '../rules/rows.js';
import { applyPending } from './selectors.js';

const initialState = {
  view: 'today',
  filters: { search: '', owner: '', stage: '', oldOnly: false, failedOnly: false },
  sort: { key: 'value', dir: 'desc' },
  currentUser: 'Priya',
  rowIds: [],
  focusedId: null,
  scrollRequest: 0, // Bumped when the table should bring the focused row into view.
  selectedIds: {}, // Object, not array: each row checks membership on render.
  changedIds: {}, // Deals whose place in the list is out of date until the user refreshes.
  bulk: null,
  announcement: '',
  sim: { minDelay: 300, maxDelay: 1500, failureRate: 0.1, editsPerMinute: 60, paused: false },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    viewChanged(state, action) { state.view = action.payload; },
    filtersChanged(state, action) { Object.assign(state.filters, action.payload); },
    sortChanged(state, action) { state.sort = action.payload; },
    currentUserChanged(state, action) { state.currentUser = action.payload; },
    rowsSet(state, action) {
      state.rowIds = action.payload.rowIds;
      state.focusedId = action.payload.focusedId;
      state.changedIds = {};
    },
    focusChanged(state, action) { state.focusedId = action.payload; },
    scrollRequested(state) { state.scrollRequest += 1; },
    selectionToggled(state, action) {
      if (state.selectedIds[action.payload]) delete state.selectedIds[action.payload];
      else state.selectedIds[action.payload] = true;
    },
    selectAllVisible(state) {
      state.selectedIds = Object.fromEntries(state.rowIds.map((id) => [id, true]));
    },
    selectionCleared(state) { state.selectedIds = {}; },
    listChangesSet(state, action) {
      for (const [id, outOfDate] of action.payload) {
        if (outOfDate) state.changedIds[id] = true;
        else delete state.changedIds[id];
      }
    },
    bulkStarted(state, action) {
      const { total, skipped = 0 } = action.payload;
      if (state.bulk?.active) {
        state.bulk.total += total;
        state.bulk.skipped += skipped;
      } else {
        state.bulk = { total, skipped, moved: 0, failed: 0, conflicts: 0, active: true };
      }
    },
    bulkProgress(state, action) {
      const { moved = 0, failed = 0, conflicts = 0 } = action.payload;
      state.bulk.moved += moved;
      state.bulk.failed += failed;
      state.bulk.conflicts += conflicts;
    },
    bulkFinished(state) { state.bulk.active = false; },
    bulkDismissed(state) { state.bulk = null; },
    announced(state, action) { state.announcement = action.payload; },
    simChanged(state, action) { Object.assign(state.sim, action.payload); },
  },
});

export const {
  viewChanged, filtersChanged, sortChanged, currentUserChanged, rowsSet, focusChanged,
  scrollRequested, selectionToggled, selectAllVisible, selectionCleared, listChangesSet, bulkStarted,
  bulkProgress, bulkFinished, bulkDismissed, announced, simChanged,
} = uiSlice.actions;
export default uiSlice.reducer;

function currentRowIds({ deals, pending, ui }) {
  return buildRowIds(deals.list, ui, pending, new Date());
}

/** Brings the same list up to date, keeping the user's place. Rows never jump on their own. */
export function rowsRefreshed() {
  return (dispatch, getState) => {
    const { ui } = getState();
    const rowIds = currentRowIds(getState());
    dispatch(rowsSet({ rowIds, focusedId: refocus(ui.rowIds, rowIds, ui.focusedId) }));
  };
}

/** Shows a different list after a new view, filter, search or sort, starting at the top. */
export function listChanged() {
  return (dispatch, getState) => {
    const rowIds = currentRowIds(getState());
    dispatch(rowsSet({ rowIds, focusedId: rowIds[0] ?? null }));
    dispatch(scrollRequested());
  };
}

/** Notes which changed deals now belong in, or out of, the list on screen. */
export function listChangesNoted(deals) {
  return (dispatch, getState) => {
    const { pending, ui } = getState();
    const listed = new Set(ui.rowIds);
    const today = new Date();
    const entries = deals.map((deal) => {
      const matches = matchesFilters(applyPending(deal, pending[deal.id]), ui, pending[deal.id], today);
      return [deal.id, matches !== listed.has(deal.id)];
    });
    if (entries.some(([id, outOfDate]) => outOfDate || ui.changedIds[id])) dispatch(listChangesSet(entries));
  };
}
