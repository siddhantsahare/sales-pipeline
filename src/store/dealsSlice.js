import { createSlice } from '@reduxjs/toolkit';
import { STAGES } from '../constants.js';

function emptyTotals() {
  return Object.fromEntries(STAGES.map((stage) => [stage, { count: 0, value: 0 }]));
}

function addToTotals(totals, deal, sign) {
  totals[deal.stage].count += sign;
  totals[deal.stage].value += sign * deal.value;
}

const dealsSlice = createSlice({
  name: 'deals',
  // A list, not an object keyed by ID: Redux copies whatever it changes, and copying an
  // array of 50,000 is far cheaper than copying an object with 50,000 keys.
  initialState: { list: [], indexById: {}, stageTotals: emptyTotals() },
  reducers: {
    dealsLoaded(state, action) {
      const indexById = {};
      const stageTotals = emptyTotals();
      action.payload.forEach((deal, index) => {
        indexById[deal.id] = index;
        addToTotals(stageTotals, deal, 1);
      });
      return { list: action.payload, indexById, stageTotals };
    },
    // Responses and teammate events can arrive out of order, so only newer versions count.
    dealsUpdated(state, action) {
      for (const deal of action.payload) {
        const index = state.indexById[deal.id];
        const held = state.list[index];
        if (held.version >= deal.version) continue;
        addToTotals(state.stageTotals, held, -1);
        addToTotals(state.stageTotals, deal, 1);
        state.list[index] = deal;
      }
    },
  },
});

export const { dealsLoaded, dealsUpdated } = dealsSlice.actions;
export default dealsSlice.reducer;
