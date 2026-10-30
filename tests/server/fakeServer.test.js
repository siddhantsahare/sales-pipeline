import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { STAGES } from '../../src/constants.js';
import { generateDeals } from '../../src/server/generateDeals.js';
import { createFakeServer } from '../../src/server/fakeServer.js';

const deal = (id) => ({
  id, company: 'Acme', value: 100, licences: 1, stage: 'new', owner: 'Priya',
  nextFollowUp: '2026-11-01', expectedClose: '2026-12-01', lastActivity: '2026-10-01',
  lastEditedBy: 'Priya', version: 1,
});

async function settle(promise) {
  promise.catch(() => {});
  await vi.runAllTimersAsync();
  return promise;
}

const move = (expectedVersion) => [{ dealId: 'd1', toStage: 'won', expectedVersion }];
let server;

beforeEach(() => {
  vi.useFakeTimers();
  server = createFakeServer({ deals: [deal('d1'), deal('d2')], random: () => 0.5 });
});
afterEach(() => { server.stop(); vi.useRealTimers(); });

test('generates the same 50,000 deals for a seed, with a stage near 10,000', () => {
  const a = generateDeals();
  const b = generateDeals();
  expect(a).toHaveLength(50000);
  expect(a[123]).toEqual(b[123]);
  const largest = Math.max(...STAGES.map((s) => a.filter((d) => d.stage === s).length));
  expect(largest).toBeGreaterThan(9000);
  expect(largest).toBeLessThan(11000);
});

test('a move with the right version succeeds and bumps version', async () => {
  const [result] = await settle(server.moveDeals(move(1)));
  expect(result.status).toBe('ok');
  expect(result.deal).toMatchObject({ stage: 'won', version: 2 });
});

test('a stale version returns conflict and changes nothing', async () => {
  const [result] = await settle(server.moveDeals(move(0)));
  expect(result.status).toBe('conflict');
  expect(result.deal).toMatchObject({ stage: 'new', version: 1 });
});

test('failNextSave rejects one request only and applies nothing', async () => {
  server.failNextSave();
  await expect(settle(server.moveDeals(move(1)))).rejects.toThrow();
  const [result] = await settle(server.moveDeals(move(1)));
  expect(result.status).toBe('ok');
});

test('forceConflictNextSave returns conflict naming a teammate', async () => {
  server.forceConflictNextSave();
  const [result] = await settle(server.moveDeals(move(1)));
  expect(result.status).toBe('conflict');
  expect(result.deal.version).toBe(2);
  expect(result.deal.lastEditedBy).not.toBe('Priya');
});

test('failureRate 1 rejects every request', async () => {
  server.updateSettings({ failureRate: 1 });
  await expect(settle(server.moveDeals(move(1)))).rejects.toThrow();
  await expect(settle(server.moveDeals(move(1)))).rejects.toThrow();
});

test('about half of teammate edits target visible ids', async () => {
  const deals = Array.from({ length: 1000 }, (_, i) => deal(`d${i}`));
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const busy = createFakeServer({ deals, random });
  busy.updateSettings({ editsPerMinute: 6000 });
  busy.setVisibleIds(['d1', 'd2', 'd3']);
  const seen = [];
  busy.subscribe((changed) => seen.push(...changed));
  busy.startTeammates();
  await vi.advanceTimersByTimeAsync(20000);
  busy.stop();
  const hits = seen.filter((d) => ['d1', 'd2', 'd3'].includes(d.id)).length;
  expect(seen.length).toBeGreaterThan(100);
  expect(hits / seen.length).toBeGreaterThan(0.3);
  expect(hits / seen.length).toBeLessThan(0.7);
});

test('paused teammates send nothing', async () => {
  const listener = vi.fn();
  server.subscribe(listener);
  server.updateSettings({ paused: true, editsPerMinute: 6000 });
  server.startTeammates();
  await vi.advanceTimersByTimeAsync(5000);
  expect(listener).not.toHaveBeenCalled();
});

test('returned deals are copies', async () => {
  const [first] = await settle(server.getDeals());
  first.stage = 'lost';
  const [again] = await settle(server.getDeals());
  expect(again.stage).toBe('new');
});
