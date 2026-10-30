import { expect, test } from 'vitest';
import { getReasons } from '../../src/rules/priority.js';
import { buildRowIds, matchesFilters, refocus } from '../../src/rules/rows.js';

const today = new Date('2026-10-30');
const FILTERS = { search: '', owner: '', stage: '', oldOnly: false, failedOnly: false };
const allView = (filters = {}, sort = { key: 'value', dir: 'desc' }) => ({
  view: 'all', currentUser: 'Priya', sort, filters: { ...FILTERS, ...filters },
});
const deal = (extra = {}) => ({
  id: 'd1', company: 'Acme Corp', value: 100, stage: 'new', owner: 'Priya',
  nextFollowUp: '2026-11-20', expectedClose: '2026-12-30', lastActivity: '2026-10-29', ...extra,
});
const byId = (...deals) => Object.fromEntries(deals.map((d) => [d.id, d]));

test('overdue follow-up comes first', () => {
  const reasons = getReasons(deal({ nextFollowUp: '2026-10-20', lastActivity: '2026-10-01' }), today);
  expect(reasons).toEqual(['Overdue follow-up', 'Idle 14+ days']);
});

test('closing within 7 days counts; 8 days does not', () => {
  expect(getReasons(deal({ expectedClose: '2026-11-06' }), today)).toEqual(['Closing this week']);
  expect(getReasons(deal({ expectedClose: '2026-11-07' }), today)).toEqual([]);
});

test('idle at 14 days counts; 13 does not', () => {
  expect(getReasons(deal({ lastActivity: '2026-10-16' }), today)).toEqual(['Idle 14+ days']);
  expect(getReasons(deal({ lastActivity: '2026-10-17' }), today)).toEqual([]);
});

test('won and lost deals have no reasons', () => {
  expect(getReasons(deal({ stage: 'won', nextFollowUp: '2026-10-01' }), today)).toEqual([]);
  expect(getReasons(deal({ stage: 'lost', nextFollowUp: '2026-10-01' }), today)).toEqual([]);
});

test('today view shows only my open deals with reasons, by urgency then value', () => {
  const deals = byId(
    deal({ id: 'idle', lastActivity: '2026-10-01', value: 900 }),
    deal({ id: 'small', nextFollowUp: '2026-10-01', value: 10 }),
    deal({ id: 'big', nextFollowUp: '2026-10-01', value: 500 }),
    deal({ id: 'theirs', owner: 'Rahul', nextFollowUp: '2026-10-01' }),
    deal({ id: 'calm' }),
  );
  const ui = { ...allView(), view: 'today' };
  expect(buildRowIds(deals, ui, {}, today)).toEqual(['big', 'small', 'idle']);
});

test('oldOnly matches open deals at 90+ days, not 89', () => {
  const ui = allView({ oldOnly: true });
  expect(matchesFilters(deal({ lastActivity: '2026-08-01' }), ui, undefined, today)).toBe(true);
  expect(matchesFilters(deal({ lastActivity: '2026-08-02' }), ui, undefined, today)).toBe(false);
  expect(matchesFilters(deal({ lastActivity: '2026-01-01', stage: 'lost' }), ui, undefined, today)).toBe(false);
});

test('failedOnly matches failed and conflicted moves', () => {
  const ui = allView({ failedOnly: true });
  expect(matchesFilters(deal(), ui, { status: 'failed' }, today)).toBe(true);
  expect(matchesFilters(deal(), ui, { status: 'conflict' }, today)).toBe(true);
  expect(matchesFilters(deal(), ui, { status: 'saving' }, today)).toBe(false);
  expect(matchesFilters(deal(), ui, undefined, today)).toBe(false);
});

test('search matches company, ignoring case', () => {
  expect(matchesFilters(deal(), allView({ search: 'acme' }), undefined, today)).toBe(true);
  expect(matchesFilters(deal(), allView({ search: 'hooli' }), undefined, today)).toBe(false);
});

test('stage filter uses the pending stage', () => {
  const deals = byId(deal({ id: 'a' }), deal({ id: 'b' }));
  const pending = { b: { toStage: 'won', status: 'saving', waiting: null } };
  expect(buildRowIds(deals, allView({ stage: 'won' }), pending, today)).toEqual(['b']);
});

test('sorts by a chosen column in either direction', () => {
  const deals = byId(deal({ id: 'a', company: 'B' }), deal({ id: 'b', company: 'A' }));
  expect(buildRowIds(deals, allView({}, { key: 'company', dir: 'asc' }), {}, today)).toEqual(['b', 'a']);
  expect(buildRowIds(deals, allView({}, { key: 'company', dir: 'desc' }), {}, today)).toEqual(['a', 'b']);
});

test('refocus keeps the deal, else the nearest row, else null', () => {
  expect(refocus(['a', 'b', 'c'], ['c', 'a'], 'a')).toBe('a');
  expect(refocus(['a', 'b', 'c'], ['a', 'c'], 'b')).toBe('c');
  expect(refocus(['a', 'b', 'c'], ['a'], 'c')).toBe('a');
  expect(refocus(['a'], [], 'a')).toBeNull();
  expect(refocus([], ['a'], null)).toBe('a');
});
