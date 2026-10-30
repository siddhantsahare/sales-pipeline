import { STAGES, STAGE_LABELS } from '../constants.js';

export default function StagePicker({ count, onChoose }) {
  return (
    <div className="overlay" role="dialog" aria-label="Move to stage">
      <p>Move {count === 1 ? 'deal' : `${count.toLocaleString('en-IN')} deals`} to:</p>
      <ol>
        {STAGES.map((stage, index) => (
          <li key={stage}>
            <button onClick={() => onChoose(stage)}>
              <kbd>{index + 1}</kbd> {STAGE_LABELS[stage]}
            </button>
          </li>
        ))}
      </ol>
      <p className="hint"><kbd>→</kbd> next stage · <kbd>Esc</kbd> cancel</p>
    </div>
  );
}
