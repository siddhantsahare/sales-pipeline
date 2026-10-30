import { OWNERS, STAGES } from '../constants.js';

const STAGE_WEIGHTS = [0.2, 0.18, 0.16, 0.14, 0.12, 0.1, 0.1];
const NAMES = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Soylent', 'Vandelay', 'Stark', 'Wayne', 'Tyrell'];
const SUFFIXES = ['Corp', 'Systems', 'Labs', 'Industries', 'Logistics', 'Foods', 'Motors', 'Health', 'Retail', 'Bank'];
const DAY_MS = 86400000;

// Seeded so every run, demo and bug report sees the same deals.
function seededRandom(seed) {
  let state = seed;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickStage(roll) {
  let total = 0;
  for (let i = 0; i < STAGES.length; i++) {
    total += STAGE_WEIGHTS[i];
    if (roll < total) return STAGES[i];
  }
  return STAGES[STAGES.length - 1];
}

function dateFrom(today, days) {
  return new Date(today.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * @param {number} count
 * @param {number} seed
 * @param {Date} today
 * @returns {import('../types.js').Deal[]}
 */
export function generateDeals(count = 50000, seed = 1, today = new Date()) {
  const random = seededRandom(seed);
  const between = (min, max) => min + Math.floor(random() * (max - min + 1));
  const deals = [];

  for (let i = 0; i < count; i++) {
    const owner = OWNERS[between(0, OWNERS.length - 1)];
    deals.push({
      id: `d${i}`,
      company: `${NAMES[between(0, 9)]} ${SUFFIXES[between(0, 9)]} ${i}`,
      value: between(50, 5000) * 1000,
      licences: between(5, 500),
      stage: pickStage(random()),
      owner,
      nextFollowUp: dateFrom(today, between(-20, 30)),
      expectedClose: dateFrom(today, between(-5, 60)),
      lastActivity: dateFrom(today, -between(0, 180)),
      lastEditedBy: owner,
      version: 1,
    });
  }
  return deals;
}
