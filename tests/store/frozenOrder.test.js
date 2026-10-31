import { beforeEach, expect, test, vi } from 'vitest';
import { createAppStore } from '../../src/store/index.js';
import { dealsLoaded, dealsUpdated } from '../../src/store/dealsSlice.js';
import {
  filtersChanged, focusChanged, listChanged, listChangesNoted, rowsRefreshed, viewChanged,
} from '../../src/store/uiSlice.js';
import { createSyncEngine } from '../../src/sync/syncEngine.js';

const deal = (id, extra = {}) => ({
  id, company: id, value: 100, stage: 'new', owner: 'Priya', version: 1,
  nextFollowUp: '2030-01-01', expectedClose: '2030-01-01', lastActivity: '2030-01-01', ...extra,
});

let store;
const ui = () => store.getState().ui;
const changedCount = () => Object.keys(ui().changedIds).length;

function teammateChanges(deals) {
  store.dispatch(dealsUpdated(deals));
  store.dispatch(listChangesNoted(deals));
}

function filterToStage(stage) {
  store.dispatch(filtersChanged({ stage }));
  store.dispatch(rowsRefreshed());
}

beforeEach(() => {
  store = createAppStore();
  store.dispatch(dealsLoaded([deal('a', { value: 300 }), deal('b', { value: 200 }), deal('c', { value: 100 })]));
  store.dispatch(viewChanged('all'));
  store.dispatch(rowsRefreshed());
  store.dispatch(focusChanged('b'));
});

test('an edit that does not affect the list shows nothing', () => {
  teammateChanges([deal('c', { value: 999, version: 2 })]);
  expect(ui().rowIds).toEqual(['a', 'b', 'c']);
  expect(changedCount()).toBe(0);
});

test('a deal that stops matching stays in rowIds until refresh', () => {
  filterToStage('new');
  teammateChanges([deal('a', { stage: 'won', version: 2 })]);
  expect(ui().rowIds).toContain('a');
  store.dispatch(rowsRefreshed());
  expect(ui().rowIds).not.toContain('a');
});

test('a deal leaving the filter counts once, however many edits it gets', () => {
  filterToStage('new');
  teammateChanges([deal('a', { stage: 'won', version: 2 })]);
  teammateChanges([deal('a', { stage: 'lost', version: 3 })]);
  expect(changedCount()).toBe(1);
});

test('a deal that comes back to matching stops counting', () => {
  filterToStage('new');
  teammateChanges([deal('a', { stage: 'won', version: 2 })]);
  teammateChanges([deal('a', { stage: 'new', version: 3 })]);
  expect(changedCount()).toBe(0);
});

test('a deal newly matching the filter counts', () => {
  filterToStage('won');
  teammateChanges([deal('a', { stage: 'won', version: 2 })]);
  expect(changedCount()).toBe(1);
});

test('refresh rebuilds rowIds, resets the count and keeps focus', () => {
  filterToStage('new');
  teammateChanges([deal('a', { stage: 'won', version: 2 })]);
  store.dispatch(rowsRefreshed());
  expect(ui().rowIds).toEqual(['b', 'c']);
  expect(changedCount()).toBe(0);
  expect(ui().focusedId).toBe('b');
});

test('a saved move that takes a deal out of the list counts', async () => {
  filterToStage('new');
  const api = {
    moveDeals: vi.fn(async (moves) => moves.map(({ dealId, toStage, expectedVersion }) => ({
      dealId, status: 'ok', deal: deal(dealId, { stage: toStage, version: expectedVersion + 1 }),
    }))),
  };
  createSyncEngine({ api, store }).move('a', 'won');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(changedCount()).toBe(1);
  expect(ui().rowIds).toEqual(['a', 'b', 'c']);
});

test('choosing a different list starts at its first row', () => {
  store.dispatch(focusChanged('c'));
  store.dispatch(filtersChanged({ stage: 'won' }));
  store.dispatch(listChanged());
  expect(ui().focusedId).toBeNull();
  store.dispatch(filtersChanged({ stage: 'new' }));
  store.dispatch(listChanged());
  expect(ui().focusedId).toBe('a');
});

test('choosing a list that still holds the focused deal starts at the top too', () => {
  store.dispatch(focusChanged('c'));
  store.dispatch(filtersChanged({ search: 'c' }));
  store.dispatch(filtersChanged({ search: '' }));
  store.dispatch(listChanged());
  expect(ui().focusedId).toBe('a');
});

test('choosing a different list asks the table to scroll', () => {
  const before = ui().scrollRequest;
  store.dispatch(filtersChanged({ stage: 'new' }));
  store.dispatch(listChanged());
  expect(ui().scrollRequest).toBe(before + 1);
});

test('a refresh alone leaves the scroll position alone', () => {
  const before = ui().scrollRequest;
  store.dispatch(rowsRefreshed());
  expect(ui().scrollRequest).toBe(before);
});
