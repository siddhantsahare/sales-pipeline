import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OWNERS, UNDO_MESSAGES } from '../constants.js';
import { selectFailedCount } from '../store/selectors.js';
import {
  announced, currentUserChanged, filtersChanged, rowsRefreshed, viewChanged,
} from '../store/uiSlice.js';
import { useEngine } from '../sync/EngineContext.js';

const VIEWS = [['today', 'My deals today'], ['all', 'All deals']];
const SEARCH_PAUSE_MS = 150;

export default function TopBar({ onShowShortcuts }) {
  const dispatch = useDispatch();
  const { engine } = useEngine();
  const view = useSelector((state) => state.ui.view);
  const filters = useSelector((state) => state.ui.filters);
  const currentUser = useSelector((state) => state.ui.currentUser);
  const failedCount = useSelector(selectFailedCount);

  const [search, setSearch] = useState('');

  function apply(action) {
    dispatch(action);
    dispatch(rowsRefreshed());
  }

  // Waits for a pause in typing, so the input never lags behind a 50,000-row rebuild.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(filtersChanged({ search }));
      dispatch(rowsRefreshed());
    }, SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [dispatch, search]);

  return (
    <header className="top-bar">
      {VIEWS.map(([id, label]) => (
        <button key={id} aria-pressed={view === id} onClick={() => apply(viewChanged(id))}>{label}</button>
      ))}
      <input
        id="search"
        type="search"
        placeholder="Search company ( / )"
        aria-label="Search company"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        aria-label="Owner"
        value={filters.owner}
        onChange={(event) => apply(filtersChanged({ owner: event.target.value }))}
      >
        <option value="">All owners</option>
        {OWNERS.map((name) => <option key={name}>{name}</option>)}
      </select>
      <label>
        <input
          type="checkbox"
          checked={filters.oldOnly}
          onChange={(event) => apply(filtersChanged({ oldOnly: event.target.checked }))}
        />
        Not touched in 90+ days
      </label>
      <label>
        <input
          type="checkbox"
          checked={filters.failedOnly}
          onChange={(event) => apply(filtersChanged({ failedOnly: event.target.checked }))}
        />
        Failed
      </label>
      {failedCount > 0 && (
        <button className="failed-count" onClick={() => apply(filtersChanged({ failedOnly: true }))}>
          {failedCount.toLocaleString('en-IN')} need attention
        </button>
      )}
      <button className="push-right" onClick={() => dispatch(announced(UNDO_MESSAGES[engine.undo()]))}>
        Undo
      </button>
      <button onClick={onShowShortcuts}>Shortcuts</button>
      <label>
        Viewing as{' '}
        <select value={currentUser} onChange={(event) => apply(currentUserChanged(event.target.value))}>
          {OWNERS.map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>
    </header>
  );
}
