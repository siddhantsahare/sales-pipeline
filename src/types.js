/**
 * @typedef {'new'|'contacted'|'demo'|'proposal'|'negotiation'|'won'|'lost'} Stage
 *
 * @typedef {Object} Deal
 * @property {string} id
 * @property {string} company
 * @property {number} value            Rupees
 * @property {number} licences
 * @property {Stage} stage
 * @property {string} owner
 * @property {string} nextFollowUp     ISO date
 * @property {string} expectedClose    ISO date
 * @property {string} lastActivity     ISO date
 * @property {string} lastEditedBy     Named on conflict rows
 * @property {number} version          Bumped on every change
 *
 * @typedef {Object} Move
 * @property {string} dealId
 * @property {Stage} toStage
 * @property {number} expectedVersion
 *
 * @typedef {Object} MoveResult
 * @property {string} dealId
 * @property {'ok'|'conflict'} status
 * @property {Deal} deal               Latest server copy
 */

export {};
