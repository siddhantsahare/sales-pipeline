import { STAGES, STAGE_LABELS } from '../constants.js';

export default function StagePicker({ count, onChoose, onCancel }) {
  return (
    <div className="dialog" role="dialog" aria-label="Move to stage">
      <p className="mb-2 font-medium text-slate-900">
        Move {count === 1 ? 'deal' : `${count.toLocaleString('en-IN')} deals`} to:
      </p>
      <ol>
        {STAGES.map((stage, index) => (
          <li key={stage}>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-indigo-50"
              onClick={() => onChoose(stage)}
            >
              <kbd>{index + 1}</kbd> {STAGE_LABELS[stage]}
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span><kbd>→</kbd> next stage</span>
        <button className="btn-small" onClick={onCancel}>Cancel (Esc)</button>
      </p>
    </div>
  );
}
