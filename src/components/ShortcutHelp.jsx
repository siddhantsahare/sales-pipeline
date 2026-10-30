const SHORTCUTS = [
  ['↑ ↓ or j k', 'Move between rows'],
  ['x', 'Select row'],
  ['Ctrl+A', 'Select every matching deal'],
  ['m', 'Move to a stage'],
  ['/', 'Search'],
  ['Ctrl+Z', 'Undo last move'],
  ['r', 'Retry failed save'],
  ['u', 'Refresh the list when deals have changed'],
  ['Esc', 'Close, or clear selection'],
  ['Tab', 'Reach every other control'],
];

export default function ShortcutHelp({ onClose }) {
  return (
    <div className="dialog" role="dialog" aria-label="Keyboard shortcuts">
      <h2 className="mb-2 font-medium text-slate-900">Keyboard shortcuts</h2>
      <dl className="mb-3">
        {SHORTCUTS.map(([key, action]) => (
          <div key={key} className="flex gap-3 py-1">
            <dt className="w-24 flex-none"><kbd>{key}</kbd></dt>
            <dd className="text-slate-600">{action}</dd>
          </div>
        ))}
      </dl>
      <button className="btn" onClick={onClose}>Close (Esc)</button>
    </div>
  );
}
