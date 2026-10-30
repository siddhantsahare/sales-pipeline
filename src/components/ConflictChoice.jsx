import { STAGE_LABELS } from '../constants.js';
import { useEngine } from '../sync/EngineContext.js';

/** Never overwrites a teammate's change: the user decides, deliberately. */
export default function ConflictChoice({ dealId, pending }) {
  const { engine } = useEngine();
  const { lastEditedBy } = pending.teammateDeal;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-xs leading-tight font-medium text-rose-700">
      <span className="w-full">{lastEditedBy} changed this</span>
      <button className="btn-small" onClick={() => engine.keepTheirs(dealId)}>Keep theirs</button>
      <button className="btn-small" onClick={() => engine.applyMine(dealId)}>
        Apply mine ({STAGE_LABELS[pending.toStage]})
      </button>
    </span>
  );
}
