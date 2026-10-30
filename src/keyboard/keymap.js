const TABLE_KEYS = {
  j: 'down',
  ArrowDown: 'down',
  k: 'up',
  ArrowUp: 'up',
  x: 'select',
  m: 'move',
  '/': 'search',
  r: 'retry',
  u: 'refresh',
  '?': 'help',
  Escape: 'close',
};

const CTRL_KEYS = { a: 'selectAll', z: 'undo' };

/** Turns a key press into an action name, or null to leave it to the browser. */
export function resolveKey({ key, ctrlKey }, { inInput, pickerOpen, confirmOpen }) {
  if (inInput || confirmOpen) return key === 'Escape' ? 'close' : null;
  if (pickerOpen) {
    if (/^[1-7]$/.test(key)) return `stage:${key}`;
    if (key === 'ArrowRight') return 'nextStage';
    return key === 'Escape' ? 'close' : null;
  }
  if (ctrlKey) return CTRL_KEYS[key] ?? null;
  return TABLE_KEYS[key] ?? null;
}
