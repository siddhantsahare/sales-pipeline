import { STAGE_LABELS } from '../constants.js';
import { useEngine } from '../sync/EngineContext.js';

/** Never overwrites a teammate's change: the user decides, deliberately. */
export default function ConflictChoice({ dealId, pending }) {
  const { engine } = useEngine();
  const { lastEditedBy } = pending.teammateDeal;
  return (
    <span className="conflict">
      {lastEditedBy} changed this{' '}
      <button onClick={() => engine.keepTheirs(dealId)}>Keep theirs</button>{' '}
      <button onClick={() => engine.applyMine(dealId)}>Apply mine ({STAGE_LABELS[pending.toStage]})</button>
    </span>
  );
}
