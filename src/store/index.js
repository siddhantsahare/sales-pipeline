import { configureStore } from '@reduxjs/toolkit';
import deals from './dealsSlice.js';
import pending from './pendingSlice.js';
import ui from './uiSlice.js';

export function createAppStore() {
  return configureStore({
    reducer: { deals, pending, ui },
    // These dev checks walk the whole state, which is far too slow at 50,000 deals.
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
  });
}
