import { beforeEach, expect, test, vi } from 'vitest';
import { createAppStore } from '../../src/store/index.js';
import { dealsLoaded, dealsUpdated } from '../../src/store/dealsSlice.js';
import {
  filtersChanged, focusChanged, rowsRefreshed, updatesCounted, viewChanged,
} from '../../src/store/uiSlice.js';
import { createSyncEngine } from '../../src/sync/syncEngine.js';

const deal = (id, extra = {}) => ({
  id, company: id, value: 100, stage: 'new', owner: 'Priya', version: 1,
  nextFollowUp: '2030-01-01', expectedClose: '2030-01-01', lastActivity: '2030-01-01', ...extra,
});

let store;
const ui = () => store.getState().ui;

function teammateChanges(deals) {
  store.dispatch(dealsUpdated(deals));
  store.dispatch(updatesCounted(deals.length));
}

beforeEach(() => {
  store = createAppStore();
  store.dispatch(dealsLoaded([deal('a', { value: 300 }), deal('b', { value: 200 }), deal('c', { value: 100 })]));
  store.dispatch(viewChanged('all'));
  store.dispatch(rowsRefreshed());
  store.dispatch(focusChanged('b'));
});

test('teammate updates leave rowIds unchanged and raise updateCount', () => {
  teammateChanges([deal('c', { value: 999, version: 2 })]);
  expect(ui().rowIds).toEqual(['a', 'b', 'c']);
  expect(ui().updateCount).toBe(1);
});

test('a deal that stops matching stays in rowIds until refresh', () => {
  store.dispatch(filtersChanged({ stage: 'new' }));
  store.dispatch(rowsRefreshed());
  teammateChanges([deal('a', { stage: 'won', version: 2 })]);
  expect(ui().rowIds).toContain('a');
  store.dispatch(rowsRefreshed());
  expect(ui().rowIds).not.toContain('a');
});

test('refresh rebuilds rowIds, resets the count and keeps focus', () => {
  teammateChanges([deal('c', { value: 999, version: 2 })]);
  store.dispatch(rowsRefreshed());
  expect(ui().rowIds).toEqual(['c', 'a', 'b']);
  expect(ui().updateCount).toBe(0);
  expect(ui().focusedId).toBe('b');
});

test('saved moves also raise updateCount', async () => {
  const api = {
    moveDeals: vi.fn(async (moves) => moves.map(({ dealId, toStage, expectedVersion }) => ({
      dealId, status: 'ok', deal: deal(dealId, { stage: toStage, version: expectedVersion + 1 }),
    }))),
  };
  createSyncEngine({ api, store }).move('a', 'won');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(ui().updateCount).toBe(1);
  expect(ui().rowIds).toEqual(['a', 'b', 'c']);
});
