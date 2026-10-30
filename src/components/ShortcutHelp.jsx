const SHORTCUTS = [
  ['↑ ↓ or j k', 'Move between rows'],
  ['x', 'Select row'],
  ['Ctrl+A', 'Select every matching deal'],
  ['m', 'Move to a stage'],
  ['/', 'Search'],
  ['Ctrl+Z', 'Undo last move'],
  ['r', 'Retry failed save'],
  ['u', 'Apply pending updates'],
  ['Esc', 'Close, or clear selection'],
  ['Tab', 'Reach every other control'],
];

export default function ShortcutHelp() {
  return (
    <div className="overlay" role="dialog" aria-label="Keyboard shortcuts">
      <dl>
        {SHORTCUTS.map(([key, action]) => (
          <div key={key}><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>
        ))}
      </dl>
    </div>
  );
}
