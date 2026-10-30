import { beforeEach, expect, test } from 'vitest';
import { createAppStore } from '../../src/store/index.js';
import { dealsLoaded, dealsUpdated } from '../../src/store/dealsSlice.js';
import { moveWaiting, movesFailed, movesQueued, movesSaved, movesSent } from '../../src/store/pendingSlice.js';
import { selectDisplayDeal } from '../../src/store/selectors.js';

const deal = (id, extra = {}) => ({ id, value: 100, stage: 'new', version: 1, ...extra });
let store;
const display = (id) => selectDisplayDeal(store.getState(), id);

beforeEach(() => {
  store = createAppStore();
  store.dispatch(dealsLoaded([deal('d1'), deal('d2', { stage: 'won', value: 50 })]));
});

test('display deal shows the pending stage while saving', () => {
  store.dispatch(movesQueued([{ dealId: 'd1', toStage: 'won' }]));
  expect(display('d1').stage).toBe('won');
});

test('display deal shows server stage after a failure', () => {
  store.dispatch(movesQueued([{ dealId: 'd1', toStage: 'won' }]));
  store.dispatch(movesFailed(['d1']));
  expect(display('d1').stage).toBe('new');
});

test('display deal shows the waiting stage when one exists', () => {
  store.dispatch(movesQueued([{ dealId: 'd1', toStage: 'won' }]));
  store.dispatch(moveWaiting({ dealId: 'd1', toStage: 'lost' }));
  expect(display('d1').stage).toBe('lost');
});

test('a saved move with a waiting move queues the waiting one', () => {
  store.dispatch(movesQueued([{ dealId: 'd1', toStage: 'won' }]));
  store.dispatch(movesSent([{ dealId: 'd1', expectedVersion: 1 }]));
  store.dispatch(moveWaiting({ dealId: 'd1', toStage: 'lost' }));
  store.dispatch(movesSaved([{ dealId: 'd1', version: 2 }]));
  expect(store.getState().pending.d1).toMatchObject({ toStage: 'lost', status: 'queued', waiting: null });
});

test('a failed move with a waiting move keeps the newer intent', () => {
  store.dispatch(movesQueued([{ dealId: 'd1', toStage: 'won' }]));
  store.dispatch(moveWaiting({ dealId: 'd1', toStage: 'lost' }));
  store.dispatch(movesFailed(['d1']));
  expect(store.getState().pending.d1).toMatchObject({ toStage: 'lost', status: 'queued' });
});

test('dealsUpdated ignores a deal older than the one held', () => {
  store.dispatch(dealsUpdated([deal('d1', { value: 300, version: 3 })]));
  store.dispatch(dealsUpdated([deal('d1', { value: 200, version: 2 })]));
  expect(display('d1').value).toBe(300);
});

test('dealsUpdated keeps a pending move visible', () => {
  store.dispatch(movesQueued([{ dealId: 'd1', toStage: 'won' }]));
  store.dispatch(dealsUpdated([deal('d1', { value: 300, version: 2 })]));
  expect(display('d1')).toMatchObject({ stage: 'won', value: 300 });
});

test('stageTotals stay correct after a stage change', () => {
  store.dispatch(dealsUpdated([deal('d1', { stage: 'won', value: 100, version: 2 })]));
  const { stageTotals } = store.getState().deals;
  expect(stageTotals.new).toEqual({ count: 0, value: 0 });
  expect(stageTotals.won).toEqual({ count: 2, value: 150 });
});

test('selectDisplayDeal returns the same object when nothing changed', () => {
  store.dispatch(movesQueued([{ dealId: 'd1', toStage: 'won' }]));
  const first = display('d1');
  store.dispatch(movesQueued([{ dealId: 'd2', toStage: 'lost' }]));
  expect(display('d1')).toBe(first);
});
