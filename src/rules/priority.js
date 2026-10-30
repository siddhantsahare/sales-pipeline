import { CLOSED_STAGES } from '../constants.js';

const DAY_MS = 86400000;

export const REASONS = ['Overdue follow-up', 'Closing this week', 'Idle 14+ days'];

function daysUntil(isoDate, today) {
  const start = Date.parse(today.toISOString().slice(0, 10));
  return Math.round((Date.parse(isoDate) - start) / DAY_MS);
}

export function isOpen(deal) {
  return !CLOSED_STAGES.includes(deal.stage);
}

export function isOld(deal, today) {
  return isOpen(deal) && daysUntil(deal.lastActivity, today) <= -90;
}

/** Why a deal needs action today, most urgent first. */
export function getReasons(deal, today) {
  if (!isOpen(deal)) return [];
  const reasons = [];
  if (daysUntil(deal.nextFollowUp, today) < 0) reasons.push(REASONS[0]);
  const daysToClose = daysUntil(deal.expectedClose, today);
  if (daysToClose >= 0 && daysToClose <= 7) reasons.push(REASONS[1]);
  if (daysUntil(deal.lastActivity, today) <= -14) reasons.push(REASONS[2]);
  return reasons;
}
