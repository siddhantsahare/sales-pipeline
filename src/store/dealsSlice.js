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
  initialState: { byId: {}, stageTotals: emptyTotals() },
  reducers: {
    dealsLoaded(state, action) {
      const byId = {};
      const stageTotals = emptyTotals();
      for (const deal of action.payload) {
        byId[deal.id] = deal;
        addToTotals(stageTotals, deal, 1);
      }
      return { byId, stageTotals };
    },
    // Responses and teammate events can arrive out of order, so only newer versions count.
    dealsUpdated(state, action) {
      for (const deal of action.payload) {
        const held = state.byId[deal.id];
        if (held && held.version >= deal.version) continue;
        if (held) addToTotals(state.stageTotals, held, -1);
        addToTotals(state.stageTotals, deal, 1);
        state.byId[deal.id] = deal;
      }
    },
  },
});

export const { dealsLoaded, dealsUpdated } = dealsSlice.actions;
export default dealsSlice.reducer;
