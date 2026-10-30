import { createSlice } from '@reduxjs/toolkit';

function newEntry(toStage, baseVersion = null) {
  return { toStage, status: 'queued', waiting: null, teammateDeal: null, baseVersion };
}

// Keyed by deal ID. baseVersion is the version the user was looking at when they
// acted, so a save conflicts properly if the deal changes before it is sent or retried.
const pendingSlice = createSlice({
  name: 'pending',
  initialState: {},
  reducers: {
    movesQueued(state, action) {
      for (const { dealId, toStage, baseVersion } of action.payload) {
        state[dealId] = newEntry(toStage, baseVersion);
      }
    },
    movesSent(state, action) {
      for (const { dealId, expectedVersion } of action.payload) {
        state[dealId].status = 'saving';
        state[dealId].baseVersion = expectedVersion;
      }
    },
    moveWaiting(state, action) {
      state[action.payload.dealId].waiting = action.payload.toStage;
    },
    movesSaved(state, action) {
      for (const { dealId, version } of action.payload) {
        const { waiting } = state[dealId];
        if (waiting) state[dealId] = newEntry(waiting, version);
        else delete state[dealId];
      }
    },
    movesFailed(state, action) {
      for (const dealId of action.payload) {
        const { waiting, baseVersion } = state[dealId];
        if (waiting) state[dealId] = newEntry(waiting, baseVersion);
        else state[dealId].status = 'failed';
      }
    },
    moveConflicted(state, action) {
      const { dealId, deal } = action.payload;
      state[dealId].status = 'conflict';
      state[dealId].toStage = state[dealId].waiting ?? state[dealId].toStage;
      state[dealId].waiting = null;
      state[dealId].teammateDeal = deal;
    },
    moveCleared(state, action) {
      delete state[action.payload];
    },
  },
});

export const {
  movesQueued, movesSent, moveWaiting, movesSaved, movesFailed, moveConflicted, moveCleared,
} = pendingSlice.actions;
export default pendingSlice.reducer;
