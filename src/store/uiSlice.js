import { createSlice } from '@reduxjs/toolkit';
import { buildRowIds, refocus } from '../rules/rows.js';

const initialState = {
  view: 'today',
  filters: { search: '', owner: '', stage: '', oldOnly: false, failedOnly: false },
  sort: { key: 'value', dir: 'desc' },
  currentUser: 'Priya',
  rowIds: [],
  focusedId: null,
  selectedIds: {}, // Object, not array: each row checks membership on render.
  updateCount: 0,
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
      state.updateCount = 0;
    },
    focusChanged(state, action) { state.focusedId = action.payload; },
    selectionToggled(state, action) {
      if (state.selectedIds[action.payload]) delete state.selectedIds[action.payload];
      else state.selectedIds[action.payload] = true;
    },
    selectAllVisible(state) {
      state.selectedIds = Object.fromEntries(state.rowIds.map((id) => [id, true]));
    },
    selectionCleared(state) { state.selectedIds = {}; },
    updatesCounted(state, action) { state.updateCount += action.payload; },
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
  selectionToggled, selectAllVisible, selectionCleared, updatesCounted, bulkStarted,
  bulkProgress, bulkFinished, bulkDismissed, announced, simChanged,
} = uiSlice.actions;
export default uiSlice.reducer;

/** Rebuilds the row order. Called only when the user asks, so rows never jump on their own. */
export function rowsRefreshed() {
  return (dispatch, getState) => {
    const { deals, pending, ui } = getState();
    const rowIds = buildRowIds(deals.byId, ui, pending, new Date());
    dispatch(rowsSet({ rowIds, focusedId: refocus(ui.rowIds, rowIds, ui.focusedId) }));
  };
}
