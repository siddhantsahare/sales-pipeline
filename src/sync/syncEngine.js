import { BATCH_SIZE, MAX_REQUESTS } from '../constants.js';
import { dealsUpdated } from '../store/dealsSlice.js';
import {
  moveCleared, moveConflicted, moveWaiting, movesFailed, movesQueued, movesSaved, movesSent,
} from '../store/pendingSlice.js';
import { selectDisplayDeal } from '../store/selectors.js';
import { announced, bulkFinished, bulkProgress, bulkStarted } from '../store/uiSlice.js';

/**
 * Owns every save. A deal has at most one move in flight and one waiting, so
 * saves for a deal stay in order and an old one can't overwrite a new one.
 */
export function createSyncEngine({ api, store }) {
  const singleQueue = []; // Sent first, one per request, so users never wait behind a bulk move.
  const bulkQueue = [];
  const inFlight = new Set();
  const bulkIds = new Set(); // Deals in the current bulk move that haven't settled yet.
  const lastSavedVersion = new Map(); // What undo compares against to spot teammates' changes.
  let undoStack = [];
  let requestsInFlight = 0;

  const state = () => store.getState();
  const confirmed = (dealId) => state().deals.byId[dealId];
  const companyOf = (dealId) => confirmed(dealId).company ?? 'deal';

  function takeBatch() {
    if (singleQueue.length > 0) return [singleQueue.shift()];
    return bulkQueue.splice(0, BATCH_SIZE);
  }

  function pump() {
    while (requestsInFlight < MAX_REQUESTS) {
      const batch = takeBatch();
      if (batch.length === 0) return;
      sendBatch(batch);
    }
  }

  function sendBatch(dealIds) {
    const moves = dealIds.map((dealId) => {
      const { toStage, baseVersion } = state().pending[dealId];
      return { dealId, toStage, expectedVersion: baseVersion ?? confirmed(dealId).version };
    });
    store.dispatch(movesSent(moves));
    dealIds.forEach((dealId) => inFlight.add(dealId));
    requestsInFlight += 1;

    api.moveDeals(moves)
      .then(handleResults, () => handleFailure(moves))
      .finally(() => {
        requestsInFlight -= 1;
        pump();
      });
  }

  function handleResults(results) {
    const saved = results.filter((result) => result.status === 'ok');
    const conflicts = results.filter((result) => result.status === 'conflict');
    const savedIds = saved.map((result) => result.dealId);

    store.dispatch(dealsUpdated(results.map((result) => result.deal)));
    saved.forEach((result) => lastSavedVersion.set(result.dealId, result.deal.version));
    store.dispatch(movesSaved(savedIds));
    for (const { dealId, deal } of conflicts) {
      forgetUndo(dealId, state().pending[dealId].toStage);
      store.dispatch(moveConflicted({ dealId, deal }));
    }
    if (results.length === 1 && conflicts.length === 1) {
      store.dispatch(announced(`Conflict on ${conflicts[0].deal.company}`));
    }
    settle(results.map((result) => result.dealId));
    countBulk(savedIds, 'moved');
    countBulk(conflicts.map((result) => result.dealId), 'conflicts');
  }

  function handleFailure(moves) {
    const dealIds = moves.map((move) => move.dealId);
    moves.forEach((move) => forgetUndo(move.dealId, move.toStage));
    store.dispatch(movesFailed(dealIds));
    if (dealIds.length === 1) store.dispatch(announced(`Couldn't save ${companyOf(dealIds[0])}`));
    settle(dealIds);
    countBulk(dealIds, 'failed');
  }

  // A waiting move becomes queued once the one ahead of it settles.
  function settle(dealIds) {
    for (const dealId of dealIds) {
      inFlight.delete(dealId);
      if (state().pending[dealId]?.status === 'queued') singleQueue.push(dealId);
    }
  }

  function countBulk(dealIds, field) {
    const counted = dealIds.filter((dealId) => bulkIds.delete(dealId));
    if (counted.length === 0) return;
    store.dispatch(bulkProgress({ [field]: counted.length }));
    if (bulkIds.size === 0) store.dispatch(bulkFinished());
  }

  function forgetUndo(dealId, toStage) {
    undoStack = undoStack.filter((entry) => !(entry.dealId === dealId && entry.toStage === toStage));
  }

  // Returns false when the deal already has a place in a queue.
  function enqueue(dealId, toStage, baseVersion) {
    const entry = state().pending[dealId];
    if (inFlight.has(dealId)) {
      store.dispatch(moveWaiting({ dealId, toStage }));
      return false;
    }
    store.dispatch(movesQueued([{ dealId, toStage, baseVersion }]));
    return entry?.status !== 'queued';
  }

  function enqueueSingle(dealId, toStage, baseVersion) {
    if (enqueue(dealId, toStage, baseVersion)) singleQueue.push(dealId);
    pump();
  }

  function move(dealId, toStage) {
    const fromStage = selectDisplayDeal(state(), dealId).stage;
    if (fromStage === toStage) return;
    undoStack.push({ dealId, fromStage, toStage });
    enqueueSingle(dealId, toStage);
  }

  function startBulk(dealIds, total, skipped, moveFor) {
    store.dispatch(bulkStarted({ total, skipped }));
    if (dealIds.length === 0) {
      store.dispatch(bulkFinished());
      return;
    }
    // One dispatch for the whole list: one per deal would freeze the UI at this size.
    const toQueue = [];
    for (const dealId of dealIds) {
      bulkIds.add(dealId);
      const { toStage, baseVersion } = moveFor(dealId);
      if (inFlight.has(dealId)) {
        store.dispatch(moveWaiting({ dealId, toStage }));
      } else {
        if (state().pending[dealId]?.status !== 'queued') bulkQueue.push(dealId);
        toQueue.push({ dealId, toStage, baseVersion });
      }
    }
    store.dispatch(movesQueued(toQueue));
    pump();
  }

  function moveMany(dealIds, toStage) {
    const toMove = dealIds.filter((id) => selectDisplayDeal(state(), id).stage !== toStage);
    startBulk(toMove, dealIds.length, dealIds.length - toMove.length, () => ({ toStage }));
  }

  function retry(dealId) {
    const { toStage, baseVersion } = state().pending[dealId];
    enqueueSingle(dealId, toStage, baseVersion);
  }

  function retryFailed() {
    const { pending } = state();
    const failedIds = Object.keys(pending).filter((id) => pending[id].status === 'failed');
    if (failedIds.length === 0) return;
    startBulk(failedIds, failedIds.length, 0, (dealId) => pending[dealId]);
  }

  function keepTheirs(dealId) {
    store.dispatch(moveCleared(dealId));
  }

  // A deliberate new move on the latest version, not a retry of the old one.
  function applyMine(dealId) {
    enqueueSingle(dealId, state().pending[dealId].toStage);
  }

  function undo() {
    const entry = undoStack.at(-1);
    if (!entry) return 'empty';
    const { dealId, fromStage } = entry;
    const isPending = Boolean(state().pending[dealId]);
    if (!isPending && confirmed(dealId).version !== lastSavedVersion.get(dealId)) {
      undoStack.pop();
      return 'blocked';
    }
    undoStack.pop();
    enqueueSingle(dealId, fromStage);
    return 'ok';
  }

  return { move, moveMany, retry, retryFailed, keepTheirs, applyMine, undo };
}
