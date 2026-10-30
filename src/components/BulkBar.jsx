import { useDispatch, useSelector } from 'react-redux';
import { bulkDismissed } from '../store/uiSlice.js';
import { useEngine } from '../sync/EngineContext.js';

const count = (number) => number.toLocaleString('en-IN');

function summary({ moved, failed, conflicts, skipped }) {
  return `${count(moved)} moved · ${count(failed)} failed · ${count(conflicts)} conflicts · ${count(skipped)} skipped`;
}

export default function BulkBar({ selectedCount, onMove }) {
  const dispatch = useDispatch();
  const { engine } = useEngine();
  const bulk = useSelector((state) => state.ui.bulk);
  if (selectedCount === 0 && !bulk) return null;

  const done = bulk ? bulk.moved + bulk.failed + bulk.conflicts + bulk.skipped : 0;

  return (
    <section className="bulk-bar" role="status">
      {selectedCount > 0 && (
        <span>
          {count(selectedCount)} selected <button onClick={onMove}>Move to… (m)</button>
        </span>
      )}
      {bulk?.active && <span>Saving {count(done)} of {count(bulk.total)}…</span>}
      {bulk && !bulk.active && (
        <span>
          {summary(bulk)}{' '}
          {bulk.failed > 0 && <button onClick={engine.retryFailed}>Retry failed</button>}{' '}
          <button onClick={() => dispatch(bulkDismissed())}>Dismiss</button>
        </span>
      )}
    </section>
  );
}
