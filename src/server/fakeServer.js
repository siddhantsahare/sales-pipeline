import { OWNERS, STAGES, TEAMMATE_BATCH_MS } from '../constants.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const today = () => new Date().toISOString().slice(0, 10);

/**
 * The only source of truth. The UI reaches it through async calls, and every
 * deal it returns is a copy, so it behaves like a real network boundary.
 *
 * @param {{ deals: import('../types.js').Deal[], random?: () => number }} options
 */
export function createFakeServer({ deals, random = Math.random }) {
  const dealsById = new Map(deals.map((deal) => [deal.id, { ...deal }]));
  const allIds = deals.map((deal) => deal.id);
  const listeners = new Set();
  const settings = { minDelay: 300, maxDelay: 1500, failureRate: 0.1, editsPerMinute: 60, paused: false };

  let visibleIds = [];
  let failNext = false;
  let conflictNext = false;
  let timer = null;
  let editsOwed = 0;

  const pick = (list) => list[Math.floor(random() * list.length)];

  function teammateEdit(id) {
    const deal = dealsById.get(id);
    const by = pick(OWNERS.filter((name) => name !== deal.lastEditedBy));
    const changeStage = random() < 0.5;
    const edit = changeStage
      ? { stage: pick(STAGES.filter((stage) => stage !== deal.stage)) }
      : { value: deal.value + 1000 };
    Object.assign(deal, edit, { lastEditedBy: by, lastActivity: today(), version: deal.version + 1 });
    return { ...deal };
  }

  function applyMove({ dealId, toStage, expectedVersion }) {
    const deal = dealsById.get(dealId);
    if (deal.version !== expectedVersion) return { dealId, status: 'conflict', deal: { ...deal } };
    Object.assign(deal, { stage: toStage, lastActivity: today(), version: deal.version + 1 });
    return { dealId, status: 'ok', deal: { ...deal } };
  }

  async function moveDeals(moves) {
    await wait(settings.minDelay + random() * (settings.maxDelay - settings.minDelay));
    if (failNext || random() < settings.failureRate) {
      failNext = false;
      throw new Error('Save failed');
    }
    if (conflictNext) {
      conflictNext = false;
      teammateEdit(moves[0].dealId);
    }
    return moves.map(applyMove);
  }

  function runTeammates() {
    if (settings.paused) return;
    editsOwed += (settings.editsPerMinute * TEAMMATE_BATCH_MS) / 60000;
    const changed = [];
    while (editsOwed >= 1) {
      editsOwed -= 1;
      // Half land on screen: random edits across 50,000 deals would almost never be seen.
      const useVisible = visibleIds.length > 0 && random() < 0.5;
      changed.push(teammateEdit(pick(useVisible ? visibleIds : allIds)));
    }
    if (changed.length > 0) listeners.forEach((listener) => listener(changed));
  }

  return {
    getDeals: async () => Array.from(dealsById.values(), (deal) => ({ ...deal })),
    moveDeals,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateSettings: (next) => Object.assign(settings, next),
    failNextSave: () => { failNext = true; },
    forceConflictNextSave: () => { conflictNext = true; },
    setVisibleIds: (ids) => { visibleIds = ids; },
    startTeammates() {
      if (!timer) timer = setInterval(runTeammates, TEAMMATE_BATCH_MS);
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
  };
}
