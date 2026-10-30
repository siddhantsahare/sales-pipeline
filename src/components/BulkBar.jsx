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
    <section
      className="flex flex-none flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-indigo-950"
      role="status"
    >
      {selectedCount > 0 && (
        <span className="flex items-center gap-2 font-medium">
          {count(selectedCount)} selected
          <button className="btn-primary" onClick={onMove}>Move to stage… (m)</button>
        </span>
      )}
      {bulk?.active && <span>Saving {count(done)} of {count(bulk.total)}…</span>}
      {bulk && !bulk.active && (
        <span className="flex flex-wrap items-center gap-2">
          {summary(bulk)}
          {bulk.failed > 0 && <button className="btn" onClick={engine.retryFailed}>Retry failed</button>}
          <button className="btn" onClick={() => dispatch(bulkDismissed())}>Dismiss</button>
        </span>
      )}
    </section>
  );
}
