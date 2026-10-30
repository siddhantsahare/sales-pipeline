import { beforeEach, expect, test, vi } from 'vitest';
import { createAppStore } from '../../src/store/index.js';
import { dealsLoaded, dealsUpdated } from '../../src/store/dealsSlice.js';
import { selectDisplayDeal } from '../../src/store/selectors.js';
import { createSyncEngine } from '../../src/sync/syncEngine.js';

const deal = (id, extra = {}) => ({ id, value: 100, stage: 'new', version: 1, lastEditedBy: 'Priya', ...extra });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const okResult = ({ dealId, toStage, expectedVersion }) => ({
  dealId, status: 'ok', deal: deal(dealId, { stage: toStage, version: expectedVersion + 1 }),
});
const conflictResult = ({ dealId }) => ({
  dealId, status: 'conflict', deal: deal(dealId, { stage: 'demo', version: 5, lastEditedBy: 'Rahul' }),
});

let store;
let api;
let engine;
const display = (id) => selectDisplayDeal(store.getState(), id);
const pending = (id) => store.getState().pending[id];
const allSent = () => api.moveDeals.mock.calls.flatMap(([moves]) => moves);
const sentStages = (id) => allSent().filter((m) => m.dealId === id).map((m) => m.toStage);

function setup(deals = [deal('d1')]) {
  store = createAppStore();
  store.dispatch(dealsLoaded(deals));
  api = { moveDeals: vi.fn(async (moves) => moves.map(okResult)) };
  engine = createSyncEngine({ api, store });
}

beforeEach(() => setup());

test('failed save returns to server state, and retry succeeds', async () => {
  api.moveDeals.mockRejectedValueOnce(new Error('network'));
  engine.move('d1', 'won');
  await flush();
  expect(display('d1').stage).toBe('new');
  expect(pending('d1').status).toBe('failed');
  engine.retry('d1');
  await flush();
  expect(display('d1').stage).toBe('won');
  expect(pending('d1')).toBeUndefined();
});

test('rapid moves keep the last, in order', async () => {
  engine.move('d1', 'contacted');
  engine.move('d1', 'demo');
  engine.move('d1', 'proposal');
  await flush();
  await flush();
  expect(sentStages('d1')).toEqual(['contacted', 'proposal']);
  expect(display('d1').stage).toBe('proposal');
});

test('stale version gives a conflict and keeps server data', async () => {
  api.moveDeals.mockImplementationOnce(async (moves) => moves.map(conflictResult));
  engine.move('d1', 'won');
  await flush();
  expect(pending('d1').status).toBe('conflict');
  expect(display('d1')).toMatchObject({ stage: 'demo', version: 5 });
});

test('keepTheirs clears the move', async () => {
  api.moveDeals.mockImplementationOnce(async (moves) => moves.map(conflictResult));
  engine.move('d1', 'won');
  await flush();
  engine.keepTheirs('d1');
  expect(pending('d1')).toBeUndefined();
  expect(display('d1').stage).toBe('demo');
});

test('applyMine sends on the latest version', async () => {
  api.moveDeals.mockImplementationOnce(async (moves) => moves.map(conflictResult));
  engine.move('d1', 'won');
  await flush();
  engine.applyMine('d1');
  await flush();
  expect(allSent().at(-1)).toMatchObject({ toStage: 'won', expectedVersion: 5 });
  expect(display('d1').stage).toBe('won');
});

test('bulk partial failure gives correct counts', async () => {
  const ids = Array.from({ length: 500 }, (_, i) => `d${i}`);
  setup(ids.map((id) => deal(id)));
  api.moveDeals
    .mockRejectedValueOnce(new Error('network'))
    .mockImplementationOnce(async (moves) => moves.map(okResult))
    .mockImplementationOnce(async (moves) => moves.map((m, i) => (i < 2 ? conflictResult(m) : okResult(m))));
  engine.moveMany(ids, 'lost');
  await flush();
  expect(api.moveDeals).toHaveBeenCalledTimes(3);
  expect(store.getState().ui.bulk).toMatchObject({ moved: 298, failed: 200, conflicts: 2, skipped: 0, active: false });
});

test('undo is blocked after a teammate change', async () => {
  engine.move('d1', 'won');
  await flush();
  store.dispatch(dealsUpdated([deal('d1', { stage: 'demo', version: 9 })]));
  expect(engine.undo()).toBe('blocked');
  expect(api.moveDeals).toHaveBeenCalledTimes(1);
});

test('undo sends a reverse move', async () => {
  engine.move('d1', 'won');
  await flush();
  expect(engine.undo()).toBe('ok');
  await flush();
  expect(display('d1').stage).toBe('new');
});

test('retry after a teammate change sends the old version and conflicts', async () => {
  api.moveDeals.mockRejectedValueOnce(new Error('network'));
  engine.move('d1', 'won');
  await flush();
  store.dispatch(dealsUpdated([deal('d1', { stage: 'demo', version: 2 })]));
  engine.retry('d1');
  expect(allSent().at(-1).expectedVersion).toBe(1);
});

test('an ok response older than a teammate event does not replace it', async () => {
  let finish;
  api.moveDeals.mockImplementationOnce((moves) => new Promise((resolve) => { finish = () => resolve(moves.map(okResult)); }));
  engine.move('d1', 'won');
  await flush();
  store.dispatch(dealsUpdated([deal('d1', { stage: 'demo', value: 999, version: 7 })]));
  finish();
  await flush();
  expect(display('d1')).toMatchObject({ value: 999, version: 7 });
});

test('bulk at 100% failure finishes', async () => {
  const ids = Array.from({ length: 450 }, (_, i) => `d${i}`);
  setup(ids.map((id) => deal(id)));
  api.moveDeals.mockRejectedValue(new Error('network'));
  engine.moveMany(ids, 'lost');
  await flush();
  expect(store.getState().ui.bulk).toMatchObject({ failed: 450, moved: 0, active: false });
});

test('queueing a big bulk move does not dispatch once per deal', () => {
  const ids = Array.from({ length: 5000 }, (_, i) => `d${i}`);
  setup(ids.map((id) => deal(id)));
  const listener = vi.fn();
  store.subscribe(listener);
  engine.moveMany(ids, 'lost');
  expect(listener.mock.calls.length).toBeLessThan(10);
});

test('moves to the current stage are skipped and counted', async () => {
  setup([deal('d1'), deal('d2', { stage: 'lost' })]);
  engine.moveMany(['d1', 'd2'], 'lost');
  await flush();
  expect(allSent().map((m) => m.dealId)).toEqual(['d1']);
  expect(store.getState().ui.bulk).toMatchObject({ moved: 1, skipped: 1 });
});

test('a single move goes ahead of queued bulk moves', async () => {
  const ids = Array.from({ length: 1000 }, (_, i) => `d${i}`);
  setup([...ids.map((id) => deal(id)), deal('solo')]);
  engine.moveMany(ids, 'lost');
  engine.move('solo', 'won');
  await flush();
  const firstAfterStart = api.moveDeals.mock.calls[3][0];
  expect(firstAfterStart[0].dealId).toBe('solo');
});

test('a single move on a deal in a running bulk move stays ordered', async () => {
  engine.moveMany(['d1'], 'lost');
  engine.move('d1', 'won');
  await flush();
  await flush();
  expect(sentStages('d1')).toEqual(['lost', 'won']);
  expect(display('d1').stage).toBe('won');
});

test('undo while pending queues the reverse', async () => {
  engine.move('d1', 'won');
  expect(engine.undo()).toBe('ok');
  await flush();
  await flush();
  expect(sentStages('d1')).toEqual(['won', 'new']);
  expect(display('d1').stage).toBe('new');
});

test('a failed move is not on the undo stack', async () => {
  api.moveDeals.mockRejectedValueOnce(new Error('network'));
  engine.move('d1', 'won');
  await flush();
  expect(engine.undo()).toBe('empty');
});

test('a failed undo gets the normal failed state', async () => {
  engine.move('d1', 'won');
  await flush();
  api.moveDeals.mockRejectedValueOnce(new Error('network'));
  engine.undo();
  await flush();
  expect(pending('d1').status).toBe('failed');
  expect(display('d1').stage).toBe('won');
});

test('a queued bulk move keeps the version from when the user acted', async () => {
  const ids = Array.from({ length: 1000 }, (_, i) => `d${i}`);
  setup(ids.map((id) => deal(id)));
  engine.moveMany(ids, 'lost');
  store.dispatch(dealsUpdated([deal('d900', { stage: 'won', version: 2 })]));
  await flush();
  expect(allSent().find((m) => m.dealId === 'd900').expectedVersion).toBe(1);
});

test('a single move queued behind busy slots keeps its version', async () => {
  const ids = Array.from({ length: 1000 }, (_, i) => `d${i}`);
  setup([...ids.map((id) => deal(id)), deal('solo')]);
  engine.moveMany(ids, 'lost');
  engine.move('solo', 'won');
  store.dispatch(dealsUpdated([deal('solo', { stage: 'demo', version: 2 })]));
  await flush();
  expect(allSent().find((m) => m.dealId === 'solo').expectedVersion).toBe(1);
});

test('a waiting move is based on the version its predecessor saved', async () => {
  let finish;
  api.moveDeals.mockImplementationOnce((moves) => new Promise((resolve) => { finish = () => resolve(moves.map(okResult)); }));
  engine.move('d1', 'contacted');
  engine.move('d1', 'demo');
  store.dispatch(dealsUpdated([deal('d1', { stage: 'won', version: 9 })]));
  finish();
  await flush();
  expect(allSent().at(-1)).toMatchObject({ toStage: 'demo', expectedVersion: 2 });
});

test('undo is blocked when the deal has a failed move and a teammate changed it', async () => {
  engine.move('d1', 'contacted');
  await flush();
  api.moveDeals.mockRejectedValueOnce(new Error('network'));
  engine.move('d1', 'demo');
  await flush();
  store.dispatch(dealsUpdated([deal('d1', { stage: 'won', version: 9 })]));
  expect(engine.undo()).toBe('blocked');
});

test('a failed request keeps the base version for the waiting move', async () => {
  api.moveDeals.mockImplementationOnce(async () => { throw new Error('network'); });
  engine.move('d1', 'contacted');
  engine.move('d1', 'demo');
  store.dispatch(dealsUpdated([deal('d1', { stage: 'won', version: 9 })]));
  await flush();
  expect(allSent().at(-1)).toMatchObject({ toStage: 'demo', expectedVersion: 1 });
});

test('a conflict keeps the latest intended stage', async () => {
  api.moveDeals.mockImplementationOnce(async (moves) => moves.map(conflictResult));
  engine.move('d1', 'contacted');
  engine.move('d1', 'proposal');
  await flush();
  expect(pending('d1')).toMatchObject({ status: 'conflict', toStage: 'proposal' });
});

test('a second bulk during a running one adds to the totals', async () => {
  const ids = Array.from({ length: 300 }, (_, i) => `d${i}`);
  setup(ids.map((id) => deal(id)));
  engine.moveMany(ids.slice(0, 250), 'lost');
  engine.moveMany(ids.slice(250), 'lost');
  expect(store.getState().ui.bulk.total).toBe(300);
  await flush();
  expect(store.getState().ui.bulk).toMatchObject({ total: 300, moved: 300, active: false });
});

test('an all-skipped bulk during a running one does not finish it', async () => {
  setup([deal('d1'), deal('d2', { stage: 'lost' })]);
  engine.moveMany(['d1'], 'lost');
  engine.moveMany(['d2'], 'lost');
  expect(store.getState().ui.bulk).toMatchObject({ active: true, skipped: 1 });
  await flush();
  expect(store.getState().ui.bulk).toMatchObject({ active: false, moved: 1, skipped: 1 });
});

test('retryFailed resends every failed move', async () => {
  const ids = ['d1', 'd2'];
  setup(ids.map((id) => deal(id)));
  api.moveDeals.mockRejectedValueOnce(new Error('network'));
  engine.moveMany(ids, 'lost');
  await flush();
  engine.retryFailed();
  await flush();
  expect(store.getState().ui.bulk).toMatchObject({ total: 2, moved: 2, failed: 0, active: false });
});
