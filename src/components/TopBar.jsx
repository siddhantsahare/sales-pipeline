import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OWNERS, UNDO_MESSAGES } from '../constants.js';
import { selectFailedCount } from '../store/selectors.js';
import {
  announced, currentUserChanged, filtersChanged, listChanged, viewChanged,
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
    dispatch(listChanged());
  }

  // Waits for a pause in typing, so the input never lags behind a 50,000-row rebuild.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(filtersChanged({ search }));
      dispatch(listChanged());
    }, SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [dispatch, search]);

  return (
    <header className="flex flex-none flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Sales pipeline</h1>
        <div className="flex rounded-lg bg-slate-200 p-0.5">
          {VIEWS.map(([id, label]) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => apply(viewChanged(id))}
              className="rounded-md px-3 py-1 font-medium text-slate-600 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-xs"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn" onClick={() => dispatch(announced(UNDO_MESSAGES[engine.undo()]))}>Undo</button>
          <button className="btn" onClick={onShowShortcuts}>Shortcuts</button>
          <label className="flex items-center gap-1.5 text-slate-500">
            Viewing as
            <select
              className="field text-slate-800"
              value={currentUser}
              onChange={(event) => apply(currentUserChanged(event.target.value))}
            >
              {OWNERS.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="search"
          type="search"
          className="field w-56"
          placeholder="Search company ( / )"
          aria-label="Search company"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="field"
          aria-label="Owner"
          value={filters.owner}
          onChange={(event) => apply(filtersChanged({ owner: event.target.value }))}
        >
          <option value="">All owners</option>
          {OWNERS.map((name) => <option key={name}>{name}</option>)}
        </select>
        <label className="chip">
          <input
            type="checkbox"
            className="check"
            checked={filters.oldOnly}
            onChange={(event) => apply(filtersChanged({ oldOnly: event.target.checked }))}
          />
          Not touched in 90+ days
        </label>
        <label className="chip">
          <input
            type="checkbox"
            className="check"
            checked={filters.failedOnly}
            onChange={(event) => apply(filtersChanged({ failedOnly: event.target.checked }))}
          />
          Failed
        </label>
        {failedCount > 0 && (
          <button
            className="rounded-md bg-rose-100 px-2.5 py-1 font-medium text-rose-700 hover:bg-rose-200"
            onClick={() => apply(filtersChanged({ failedOnly: true }))}
          >
            {failedCount.toLocaleString('en-IN')} need attention
          </button>
        )}
      </div>
    </header>
  );
}
